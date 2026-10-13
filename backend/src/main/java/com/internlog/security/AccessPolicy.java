package com.internlog.security;

import com.internlog.exception.NotFoundException;
import com.internlog.model.Application;
import com.internlog.model.Internship;
import com.internlog.model.InternshipStatus;
import com.internlog.repository.*;
import java.time.LocalDate;
import java.util.Objects;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Object-level authorization; IDs supplied by clients are never trusted. */
@Component
@Transactional(readOnly = true)
public class AccessPolicy {
  private final InternshipRepository internships;
  private final ApplicationRepository applications;
  private final SavedSearchRepository searches;

  public AccessPolicy(InternshipRepository internships, ApplicationRepository applications,
      SavedSearchRepository searches) {
    this.internships = internships;
    this.applications = applications;
    this.searches = searches;
  }

  public SessionIdentity identity() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !(auth.getPrincipal() instanceof SessionIdentity identity)) deny();
    return (SessionIdentity) auth.getPrincipal();
  }

  public boolean isAdmin() { return "admin".equals(identity().role()); }
  public void admin() { if (!isAdmin()) deny(); }
  public void user(Long id) { owner("user", id); }
  public void company(Long id) { owner("company", id); }

  private void owner(String role, Long id) {
    SessionIdentity who = identity();
    if (!"admin".equals(who.role()) && !(role.equals(who.role()) && Objects.equals(who.id(), id))) deny();
  }

  public Internship internship(Long id, boolean readOnly) {
    Internship job = internships.findById(id).orElseThrow(() -> new NotFoundException("Internship not found."));
    SessionIdentity who = identity();
    if ("admin".equals(who.role())) return job;
    if ("company".equals(who.role()) && job.getCompany() != null
        && Objects.equals(who.id(), job.getCompany().getId())) return job;
    if (readOnly && "user".equals(who.role()) && job.getStatus() == InternshipStatus.Published
        && job.getCompany() != null && job.getCompany().isApproved()
        && (job.getDeadline() == null || !job.getDeadline().isBefore(LocalDate.now()))) return job;
    deny();
    return job;
  }

  public Application application(Long id, boolean allowCompany) {
    Application app = applications.findById(id).orElseThrow(() -> new NotFoundException("Application not found."));
    SessionIdentity who = identity();
    if ("admin".equals(who.role())) return app;
    if ("user".equals(who.role()) && Objects.equals(who.id(), app.getUser().getId())) return app;
    if (allowCompany && "company".equals(who.role()) && app.getCompany() != null
        && Objects.equals(who.id(), app.getCompany().getId())) return app;
    deny();
    return app;
  }

  public void alert(Long id) {
    var search = searches.findById(id).orElseThrow(() -> new NotFoundException("Alert not found."));
    user(search.getUser().getId());
  }

  public void deny() { throw new AccessDeniedException("You do not have permission for this action."); }
}
