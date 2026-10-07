package com.internlog.service.impl;

import com.internlog.dto.ApplicationRequest;
import com.internlog.dto.AuthDtos.ApplicationResponse;
import com.internlog.exception.*;
import com.internlog.model.*;
import com.internlog.repository.*;
import com.internlog.service.ApplicationService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApplicationServiceImpl implements ApplicationService {

  private final ApplicationRepository applications;
  private final UserRepository users;
  private final InternshipRepository internships;
  private final CompanyRepository companies;

  public ApplicationServiceImpl(ApplicationRepository applications, UserRepository users,
      InternshipRepository internships, CompanyRepository companies) {
    this.applications = applications;
    this.users = users;
    this.internships = internships;
    this.companies = companies;
  }

  private LocalDate parseDate(String value) {
    if (value == null || value.isBlank()) return null;
    return LocalDate.parse(value.substring(0, 10));
  }

  private ApplicationStatus parseStatus(String value) {
    if (value == null || value.isBlank()) return ApplicationStatus.Applied;
    for (ApplicationStatus s : ApplicationStatus.values()) {
      if (s.name().equalsIgnoreCase(value.trim())) return s;
    }
    throw new BadRequestException("Unknown application status: " + value);
  }

  @Override
  @Transactional
  public Application create(ApplicationRequest req) {
    if (req.userId == null) throw new BadRequestException("userId is required.");
    User user = users.findById(req.userId).orElseThrow(() -> new NotFoundException("User not found."));
    Application app = new Application();
    app.setUser(user);
    if (req.internshipId != null) {
      Internship job = internships.findById(req.internshipId)
          .orElseThrow(() -> new NotFoundException("Internship not found."));
      app.setInternship(job);
      try {
        if (job.getCompany() != null) {
          Company c = companies.findById(job.getCompany().getId()).orElse(null);
          app.setCompany(c);
        }
      } catch (Exception ignored) {}
      if (app.getCompanyName() == null) app.setCompanyName(job.getCompanyName());
      if (req.role == null) req.role = job.getTitle();
      if (req.location == null) req.location = job.getLocation();
      if (req.deadline == null && job.getDeadline() != null) app.setDeadline(job.getDeadline());
    }
    app.setCompanyName(req.company != null ? req.company : app.getCompanyName());
    app.setRole(req.role);
    app.setLocation(req.location);
    app.setType(req.internshipType != null ? req.internshipType : "On-site");
    app.setAppliedDate(parseDate(req.appliedDate) != null ? parseDate(req.appliedDate) : LocalDate.now());
    if (req.deadline != null) app.setDeadline(parseDate(req.deadline));
    app.setInterviewDate(parseDate(req.interviewDate));
    app.setStipend(req.stipend != null ? req.stipend : 0);
    app.setStatus(parseStatus(req.status));
    app.setUrl(req.url);
    app.setNotes(req.notes);
    app.setUpdatedAt(Instant.now());
    if (app.getCompanyName() == null || app.getRole() == null) {
      throw new BadRequestException("company and role are required.");
    }
    return applications.save(app);
  }

  @Override
  @Transactional
  public Application applyToInternship(Long userId, Long internshipId) {
    if (applications.findByUserIdAndInternshipId(userId, internshipId).isPresent()) {
      throw new BadRequestException("You already applied to this internship.");
    }
    User user = users.findById(userId).orElseThrow(() -> new NotFoundException("User not found."));
    Internship job = internships.findById(internshipId)
        .orElseThrow(() -> new NotFoundException("Internship not found."));
    if (job.getStatus() != InternshipStatus.Published) {
      throw new BadRequestException("This internship is not accepting applications.");
    }
    Application app = new Application();
    app.setUser(user);
    app.setInternship(job);
    try {
      if (job.getCompany() != null) {
        app.setCompany(companies.findById(job.getCompany().getId()).orElse(null));
      }
    } catch (Exception ignored) {}
    app.setCompanyName(job.getCompanyName());
    app.setRole(job.getTitle());
    app.setLocation(job.getLocation());
    app.setType(job.getType());
    app.setAppliedDate(LocalDate.now());
    app.setDeadline(job.getDeadline());
    app.setStipend(job.getStipend() != null ? job.getStipend() : 0);
    app.setStatus(ApplicationStatus.Applied);
    app.setUrl(job.getApplyUrl());
    app.setNotes("Applied from the InternLog opportunity board.");
    app.setUpdatedAt(Instant.now());
    return applications.save(app);
  }

  @Override
  public Application getById(Long id) {
    return applications.findById(id).orElseThrow(() -> new NotFoundException("Application not found."));
  }

  @Override
  public List<Application> list(Long userId, String status, String query) {
    List<Application> all = userId != null ? applications.findByUserId(userId) : applications.findAll();
    if (status != null && !status.equalsIgnoreCase("all") && !status.equalsIgnoreCase("followup")) {
      ApplicationStatus want = parseStatus(status);
      all = all.stream().filter(a -> a.getStatus() == want).collect(Collectors.toList());
    }
    if (query != null && !query.isBlank()) {
      String q = query.toLowerCase();
      all = all.stream().filter(a -> ((a.getCompanyName() == null ? "" : a.getCompanyName()) + " "
          + (a.getRole() == null ? "" : a.getRole()) + " "
          + (a.getLocation() == null ? "" : a.getLocation())).toLowerCase().contains(q))
          .collect(Collectors.toList());
    }
    all.sort(Comparator.comparing(Application::getAppliedDate,
        Comparator.nullsLast(Comparator.naturalOrder())).reversed());
    return all;
  }

  private long daysSince(LocalDate date) {
    if (date == null) return 999;
    return LocalDate.now().toEpochDay() - date.toEpochDay();
  }

  @Override
  public List<Application> needsFollowup(Long userId) {
    List<Application> all = userId != null ? applications.findByUserId(userId) : applications.findAll();
    return all.stream().filter(a -> {
      if (a.getStatus() == ApplicationStatus.Selected || a.getStatus() == ApplicationStatus.Rejected) return false;
      LocalDate last = a.getAppliedDate();
      try {
        if (a.getUpdatedAt() != null) {
          LocalDate updated = LocalDate.parse(a.getUpdatedAt().toString().substring(0, 10));
          if (updated.isAfter(last)) last = updated;
        }
      } catch (Exception ignored) {}
      long idle = daysSince(last);
      if (a.getStatus() == ApplicationStatus.Applied) return idle >= 7;
      if (a.getStatus() == ApplicationStatus.Shortlisted) return idle >= 5;
      if (a.getStatus() == ApplicationStatus.Interview && a.getInterviewDate() != null) {
        long diff = a.getInterviewDate().toEpochDay() - LocalDate.now().toEpochDay();
        return (diff >= 0 && diff <= 3) || (diff < 0 && idle >= 3);
      }
      return false;
    }).collect(Collectors.toList());
  }

  @Override
  @Transactional
  public Application update(Long id, ApplicationRequest req) {
    Application app = getById(id);
    if (req.company != null) app.setCompanyName(req.company);
    if (req.role != null) app.setRole(req.role);
    if (req.location != null) app.setLocation(req.location);
    if (req.internshipType != null) app.setType(req.internshipType);
    if (req.appliedDate != null) app.setAppliedDate(parseDate(req.appliedDate));
    if (req.deadline != null) app.setDeadline(parseDate(req.deadline));
    if (req.interviewDate != null) app.setInterviewDate(parseDate(req.interviewDate));
    if (req.stipend != null) app.setStipend(req.stipend);
    if (req.status != null) app.setStatus(parseStatus(req.status));
    if (req.url != null) app.setUrl(req.url);
    if (req.notes != null) app.setNotes(req.notes);
    app.setUpdatedAt(Instant.now());
    return applications.save(app);
  }

  @Override
  @Transactional
  public Application setStatus(Long id, String status) {
    Application app = getById(id);
    app.setStatus(parseStatus(status));
    app.setUpdatedAt(Instant.now());
    return applications.save(app);
  }

  @Override
  @Transactional
  public void delete(Long id) {
    getById(id);
    applications.deleteById(id);
  }

  @Override
  public ApplicationResponse toResponse(Application app) {
    Long userId = null, internshipId = null, companyId = null;
    String studentName = null, studentEmail = null;
    try {
      if (app.getUser() != null) {
        userId = app.getUser().getId();
        studentName = app.getUser().getName();
        studentEmail = app.getUser().getEmail();
      }
      if (app.getInternship() != null) internshipId = app.getInternship().getId();
      if (app.getCompany() != null) companyId = app.getCompany().getId();
    } catch (Exception ignored) {}
    return new ApplicationResponse(
        app.getId(), userId, internshipId, companyId, app.getCompanyName(), app.getRole(),
        app.getLocation(), app.getType(),
        app.getAppliedDate() != null ? app.getAppliedDate().toString() : null,
        app.getDeadline() != null ? app.getDeadline().toString() : null,
        app.getInterviewDate() != null ? app.getInterviewDate().toString() : null,
        app.getStipend(), app.getStatus().name(), app.getUrl(), app.getNotes(),
        studentName, studentEmail);
  }
}
