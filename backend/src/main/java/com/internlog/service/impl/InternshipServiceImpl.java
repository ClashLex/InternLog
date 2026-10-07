package com.internlog.service.impl;

import com.internlog.dto.AuthDtos.InternshipResponse;
import com.internlog.dto.InternshipRequest;
import com.internlog.exception.*;
import com.internlog.model.*;
import com.internlog.repository.*;
import com.internlog.service.InternshipService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InternshipServiceImpl implements InternshipService {

  private final InternshipRepository internships;
  private final CompanyRepository companies;
  private final ApplicationRepository applications;

  public InternshipServiceImpl(InternshipRepository internships, CompanyRepository companies,
      ApplicationRepository applications) {
    this.internships = internships;
    this.companies = companies;
    this.applications = applications;
  }

  private Company requireCompany(Long companyId) {
    return companies.findById(companyId)
        .orElseThrow(() -> new NotFoundException("Company not found."));
  }

  private InternshipStatus resolveStatus(Company company, boolean publishRequested, LocalDate deadline) {
    InternshipStatus status = publishRequested ? InternshipStatus.Pending_Review : InternshipStatus.Draft;
    if (status == InternshipStatus.Pending_Review && !company.isApproved()) {
      status = InternshipStatus.Pending_Review; // stays in review queue, never auto-published
    }
    if (deadline != null && deadline.isBefore(LocalDate.now())
        && (status == InternshipStatus.Published)) {
      status = InternshipStatus.Expired;
    }
    return status;
  }

  private LocalDate parseDate(String value) {
    if (value == null || value.isBlank()) return null;
    return LocalDate.parse(value.substring(0, 10));
  }

  @Override
  @Transactional
  public Internship create(InternshipRequest req) {
    Company company = requireCompany(req.companyId);
    Internship job = new Internship();
    job.setCompany(company);
    job.setCompanyName(company.getName());
    job.setTitle(req.title);
    job.setLocation(req.location);
    job.setType(req.internshipType != null ? req.internshipType : "On-site");
    job.setStipend(req.stipend != null ? req.stipend : 0);
    job.setPositions(req.positions != null ? req.positions : 1);
    job.setDeadline(parseDate(req.deadline));
    job.setSkillsCsv(req.skills != null ? String.join(", ", req.skills) : "");
    job.setDescription(req.description);
    job.setEducation(req.education);
    job.setApplyUrl(req.applyUrl);
    job.setStatus(resolveStatus(company, req.publishRequested == null || req.publishRequested, job.getDeadline()));
    job.setCreatedAt(Instant.now());
    return internships.save(job);
  }

  @Override
  public Internship getById(Long id) {
    return internships.findById(id).orElseThrow(() -> new NotFoundException("Internship not found."));
  }

  @Override
  public List<Internship> list(String status, Long companyId, String query) {
    List<Internship> all = companyId != null ? internships.findByCompanyId(companyId) : internships.findAll();
    if (status != null && !status.equalsIgnoreCase("all")) {
      InternshipStatus want = InternshipStatus.fromString(status);
      all = all.stream().filter(j -> j.getStatus() == want).collect(Collectors.toList());
    }
    if (query != null && !query.isBlank()) {
      String q = query.toLowerCase();
      all = all.stream().filter(j -> ((j.getTitle() == null ? "" : j.getTitle()) + " "
          + (j.getCompanyName() == null ? "" : j.getCompanyName()) + " "
          + (j.getLocation() == null ? "" : j.getLocation()) + " "
          + (j.getDescription() == null ? "" : j.getDescription()) + " "
          + (j.getSkillsCsv() == null ? "" : j.getSkillsCsv())).toLowerCase().contains(q))
          .collect(Collectors.toList());
    }
    all.sort(Comparator.comparing(Internship::getCreatedAt,
        Comparator.nullsLast(Comparator.naturalOrder())).reversed());
    return all;
  }

  @Override
  public List<Internship> publicBoard() {
    LocalDate today = LocalDate.now();
    return internships.findAll().stream()
        .filter(j -> j.getStatus() == InternshipStatus.Published)
        .filter(j -> {
          try {
            Company c = companies.findById(j.getCompany().getId()).orElse(null);
            return c != null && c.isApproved();
          } catch (Exception e) {
            return false;
          }
        })
        .filter(j -> j.getDeadline() == null || !j.getDeadline().isBefore(today))
        .sorted(Comparator.comparing(Internship::getCreatedAt,
            Comparator.nullsLast(Comparator.naturalOrder())).reversed())
        .collect(Collectors.toList());
  }

  @Override
  @Transactional
  public Internship update(Long id, InternshipRequest req) {
    Internship job = getById(id);
    if (req.title != null) job.setTitle(req.title);
    if (req.location != null) job.setLocation(req.location);
    if (req.internshipType != null) job.setType(req.internshipType);
    if (req.stipend != null) job.setStipend(req.stipend);
    if (req.positions != null) job.setPositions(req.positions);
    if (req.deadline != null) job.setDeadline(parseDate(req.deadline));
    if (req.skills != null) job.setSkillsCsv(String.join(", ", req.skills));
    if (req.description != null) job.setDescription(req.description);
    if (req.education != null) job.setEducation(req.education);
    if (req.applyUrl != null) job.setApplyUrl(req.applyUrl);
    if (req.publishRequested != null) {
      job.setStatus(req.publishRequested ? InternshipStatus.Pending_Review : InternshipStatus.Draft);
      if (req.publishRequested) job.setModerationNote("Updated by company; requires admin review before publication.");
    }
    job.setUpdatedAt(Instant.now());
    return internships.save(job);
  }

  @Override
  @Transactional
  public Internship setStatus(Long id, String status) {
    Internship job = getById(id);
    String normalized = status.trim().toLowerCase();
    Company company = null;
    try {
      company = companies.findById(job.getCompany().getId()).orElse(null);
    } catch (Exception ignored) {}
    switch (normalized) {
      case "approve", "approved", "published", "publish", "review / publish" -> {
        if (company == null || !company.isApproved()) {
          throw new BadRequestException("Verify the company before publishing this internship.");
        }
        if (job.getDeadline() != null && job.getDeadline().isBefore(LocalDate.now())) {
          job.setStatus(InternshipStatus.Expired);
        } else {
          job.setStatus(InternshipStatus.Published);
          job.setModerationNote("Approved by admin.");
        }
        job.setModeratedAt(Instant.now());
      }
      case "reject", "rejected" -> {
        job.setStatus(InternshipStatus.Rejected);
        job.setModeratedAt(Instant.now());
        job.setModerationNote("Rejected by admin.");
      }
      case "archive", "archived" -> {
        job.setStatus(InternshipStatus.Archived);
        job.setModeratedAt(Instant.now());
      }
      case "draft" -> job.setStatus(InternshipStatus.Draft);
      case "pending review", "pending_review", "pending" -> job.setStatus(InternshipStatus.Pending_Review);
      case "expired" -> job.setStatus(InternshipStatus.Expired);
      case "suspended" -> job.setStatus(InternshipStatus.Suspended);
      default -> throw new BadRequestException("Unknown internship status: " + status);
    }
    return internships.save(job);
  }

  @Override
  @Transactional
  public void delete(Long id) {
    getById(id);
    applications.deleteByInternshipId(id);
    internships.deleteById(id);
  }

  @Override
  public InternshipResponse toResponse(Internship job) {
    Long companyId = null;
    try {
      companyId = job.getCompany() != null ? job.getCompany().getId() : null;
    } catch (Exception ignored) {}
    List<String> skills = job.getSkillsCsv() == null || job.getSkillsCsv().isBlank()
        ? List.of() : Arrays.stream(job.getSkillsCsv().split(",")).map(String::trim)
            .filter(s -> !s.isEmpty()).toList();
    return new InternshipResponse(
        job.getId(), companyId, job.getCompanyName(), job.getTitle(), job.getLocation(),
        job.getType(), job.getStipend(), job.getPositions(),
        job.getDeadline() != null ? job.getDeadline().toString() : null,
        skills, job.getDescription(), job.getEducation(), job.getApplyUrl(),
        job.getStatus().toFrontend(),
        job.getCreatedAt() != null ? job.getCreatedAt().toString() : null,
        job.getUpdatedAt() != null ? job.getUpdatedAt().toString() : null,
        job.getModerationNote());
  }
}
