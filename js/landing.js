/* Homepage discovery uses only published opportunities from the Java API. */
(function () {
  "use strict";

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function dateLabel(value) {
    if (!value) return "Not specified";
    var parts = String(value).split("T")[0].split("-");
    if (parts.length !== 3) return "Not specified";
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return isNaN(date.getTime()) ? "Not specified" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function stipendLabel(job) {
    var amount = Number(job.stipend);
    return Number.isFinite(amount) && amount > 0 ? "₹" + amount.toLocaleString("en-IN") + " / month" : "Stipend not specified";
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var api = window.InternLog;
    var grid = document.getElementById("landingJobs");
    if (!grid || !api) return;

    var search = document.getElementById("landingSearch");
    var type = document.getElementById("landingType");
    var results = document.getElementById("landingResults");
    var dialog = document.getElementById("landingJobDialog");
    var jobs = [], appliedIds = new Set(), currentJob = null, busy = false, loading = true, boardUnavailable = false;

    function showState(title, message, reset) {
      grid.textContent = "";
      var state = element("div", "landing-board-state");
      state.appendChild(element("h3", "", title));
      state.appendChild(element("p", "", message));
      if (reset) {
        var button = element("button", "btn btn-secondary btn-sm", "Clear filters");
        button.type = "button";
        button.addEventListener("click", clearFilters);
        state.appendChild(button);
      } else if (boardUnavailable) {
        var retry = element("button", "btn btn-secondary btn-sm", "Retry live listings");
        retry.type = "button";
        retry.addEventListener("click", async function () {
          retry.disabled = true;
          try { await api.refreshConnection(); await loadJobs(); }
          finally { retry.disabled = false; }
        });
        state.appendChild(retry);
      } else if (!jobs.length) {
        var link = element("a", "landing-text-link", "Start your application tracker ↗");
        link.href = "user/register.html";
        state.appendChild(link);
      }
      grid.appendChild(state);
    }

    function clearFilters() { search.value = ""; type.value = "all"; render(); }

    function detail(text, icon) {
      var row = element("p", "landing-job-detail");
      var mark = element("span", "", icon);
      mark.setAttribute("aria-hidden", "true");
      row.appendChild(mark);
      row.appendChild(element("span", "", text));
      return row;
    }

    function render() {
      if (loading) return;
      if (boardUnavailable) {
        results.textContent = "Live internship listings are temporarily unavailable.";
        showState("Keep exploring. Live roles will return soon.", "The listing service is unavailable right now. You can browse the rest of the site and retry when Java is connected. No offline listings are shown.", false);
        return;
      }
      var query = search.value.trim().toLowerCase();
      var visible = jobs.filter(function (job) {
        var arrangement = job.internshipType || job.type || "";
        var skills = Array.isArray(job.skills) ? job.skills.join(" ") : "";
        var haystack = [job.title, job.company, job.location, job.description, skills].join(" ").toLowerCase();
        return (type.value === "all" || type.value === arrangement) && (!query || haystack.indexOf(query) !== -1);
      });
      results.textContent = visible.length + " " + (visible.length === 1 ? "opportunity" : "opportunities") + (query || type.value !== "all" ? " matching your search" : " to explore");
      if (!visible.length) {
        showState(jobs.length ? "A different search might be your next step." : "Your next opportunity is on its way.",
          jobs.length ? "Try another role, skill or work arrangement to find more possibilities." : "Published internships will appear here after company verification and publication review. You can still start tracking roles you find elsewhere.", !!jobs.length);
        return;
      }
      grid.textContent = "";
      visible.forEach(function (job) {
        var card = element("article", "landing-job-card");
        var top = element("div", "landing-job-top");
        top.appendChild(element("span", "landing-company-icon", String(job.company || "I").trim().charAt(0).toUpperCase()));
        top.appendChild(element("span", "landing-arrangement", job.internshipType || job.type || "Not specified"));
        card.appendChild(top);
        card.appendChild(element("h3", "", job.title || "Internship"));
        card.appendChild(element("p", "landing-job-company", job.company || "Company"));
        var description = String(job.description || "View the role to learn more about this opportunity.");
        card.appendChild(element("p", "landing-job-description", description.length > 140 ? description.slice(0, 137) + "…" : description));
        card.appendChild(detail(job.location || "Location not specified", "⌖"));
        card.appendChild(detail(stipendLabel(job), "◇"));
        var bottom = element("div", "landing-job-bottom");
        bottom.appendChild(element("span", "", job.deadline ? "Apply by " + dateLabel(job.deadline) : "Deadline not specified"));
        var view = element("button", "btn btn-secondary btn-sm", "View role ↗");
        view.type = "button";
        view.setAttribute("aria-label", "View " + (job.title || "internship") + " at " + (job.company || "company"));
        view.addEventListener("click", function () { openJob(job); });
        bottom.appendChild(view);
        card.appendChild(bottom);
        grid.appendChild(card);
      });
    }

    function actionLink(label, href, secondary) {
      var link = element("a", "btn" + (secondary ? " btn-secondary" : ""), label);
      link.href = href;
      return link;
    }

    function renderActions() {
      if (!currentJob) return;
      var job = currentJob;
      var actions = document.getElementById("landingJobActions");
      actions.textContent = "";
      var identity = api.getSession();
      if (!identity) {
        document.getElementById("landingJobMessage").textContent = "Sign in with a student account to save this role or record an application.";
        actions.appendChild(actionLink("Create account", "user/register.html", true));
        actions.appendChild(actionLink("Student login", "user/login.html"));
        return;
      }
      if (identity.role !== "user") {
        document.getElementById("landingJobMessage").textContent = "You can browse here. Saving and applying are available from student accounts.";
        actions.appendChild(actionLink("Open my workspace", identity.role === "company" ? "company/dashboard.html" : "admin/dashboard.html"));
        return;
      }
      var saved = api.getPreference("savedInternships", []).map(String).includes(String(job.id));
      var applied = appliedIds.has(String(job.id));
      var save = element("button", "btn btn-secondary", saved ? "Saved" : "Save internship");
      save.type = "button";
      save.disabled = saved || busy;
      save.addEventListener("click", async function () {
        busy = true; renderActions();
        try {
          await api.saveInternship(job.id);
          if (currentJob === job) document.getElementById("landingJobMessage").textContent = "Internship saved to your account.";
        } catch (error) { api.showNotification(error.message || "Could not save this internship.", "error"); }
        finally { busy = false; renderActions(); }
      });
      var apply = element("button", "btn", applied ? "Applied" : "Apply to internship");
      apply.type = "button";
      apply.disabled = applied || busy;
      apply.addEventListener("click", async function () {
        var student = api.getSession();
        if (!student || student.role !== "user") { renderActions(); return; }
        busy = true; renderActions();
        try {
          await api.applyToInternship(student.userId, job.id);
          appliedIds.add(String(job.id));
          if (currentJob === job) document.getElementById("landingJobMessage").textContent = "Application recorded. Follow its progress in your student workspace.";
          api.showNotification("Application recorded.", "success");
        } catch (error) { api.showNotification(error.message || "Could not record this application.", "error"); }
        finally { busy = false; renderActions(); }
      });
      actions.appendChild(save);
      actions.appendChild(apply);
      actions.appendChild(actionLink("My applications", "user/applications.html", true));
    }

    function openJob(job) {
      currentJob = job;
      document.getElementById("landingJobCompany").textContent = job.company || "Company";
      document.getElementById("landingJobTitle").textContent = job.title || "Internship";
      document.getElementById("landingJobDescription").textContent = job.description || "No further role description provided.";
      document.getElementById("landingJobEducation").textContent = job.education ? "Preferred education: " + job.education : "";
      document.getElementById("landingJobMessage").textContent = "";
      var metadata = document.getElementById("landingJobMeta");
      metadata.textContent = "";
      [["Location", job.location || "Not specified"], ["Arrangement", job.internshipType || job.type || "Not specified"],
        ["Monthly stipend", stipendLabel(job)], ["Positions", job.positions || "Not specified"], ["Apply by", dateLabel(job.deadline)]].forEach(function (pair) {
        metadata.appendChild(element("dt", "", pair[0]));
        metadata.appendChild(element("dd", "", pair[1]));
      });
      var skills = document.getElementById("landingJobSkills");
      skills.textContent = "";
      (Array.isArray(job.skills) ? job.skills : []).forEach(function (skill) { skills.appendChild(element("span", "", skill)); });
      var external = document.getElementById("landingExternalLink");
      external.hidden = true;
      external.removeAttribute("href");
      if (job.applyUrl) {
        try {
          var url = new URL(job.applyUrl);
          if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) {
            external.href = url.href;
            external.hidden = false;
          }
        } catch (error) {}
      }
      renderActions();
      dialog.showModal();
    }

    document.getElementById("landingSearchForm").addEventListener("submit", function (event) { event.preventDefault(); render(); });
    search.addEventListener("input", render);
    type.addEventListener("change", render);
    document.getElementById("landingReset").addEventListener("click", clearFilters);
    document.getElementById("landingJobClose").addEventListener("click", function () { dialog.close(); });

    async function loadJobs() {
      loading = true;
      grid.setAttribute("aria-busy", "true");
      results.textContent = "Checking live internship listings…";
      try {
        if (!await api.ready) throw new Error("Live listing service unavailable.");
        var identity = api.getSession();
        if (identity) {
          var workspace = { user: "user/dashboard.html", company: "company/dashboard.html", admin: "admin/dashboard.html" }[identity.role];
          if (workspace) document.querySelectorAll("[data-landing-account]").forEach(function (link) {
            link.setAttribute("href", workspace);
            var labels = link.querySelectorAll(".pill-label, .pill-label-hover");
            if (labels.length) labels.forEach(function (label) { label.textContent = "My workspace"; });
            else link.textContent = "My workspace";
          });
        }
        var rows = await api.getPublicInternships();
        if (!Array.isArray(rows)) throw new Error("Could not load published internships.");
        jobs = rows.filter(function (job) { return job && job.status === "Published"; }).sort(function (a, b) {
          return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
        });
        if (api.getSession() && api.getSession().role === "user") {
          try {
            var applications = await api.getApplicationsByUser(api.getSession().userId);
            applications.forEach(function (application) { if (application.internshipId != null) appliedIds.add(String(application.internshipId)); });
          } catch (error) { api.showNotification("Could not check your existing applications. The server will still prevent duplicate submissions.", "info"); }
        }
        boardUnavailable = false;
      } catch (error) {
        jobs = [];
        boardUnavailable = true;
      } finally {
        loading = false;
        grid.setAttribute("aria-busy", "false");
        render();
      }
    }
    await loadJobs();
  });
})();
