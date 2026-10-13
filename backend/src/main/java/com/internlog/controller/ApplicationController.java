package com.internlog.controller;

import com.internlog.dto.ApplicationRequest;
import com.internlog.dto.AuthDtos.*;
import com.internlog.model.Application;
import com.internlog.service.ApplicationService;
import com.internlog.security.AccessPolicy;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * GET /api/applications?userId=&status=&q= (frontend: getApplications / getApplicationsByUser)
 * GET /api/applications/needs-followup?userId= (frontend: getFollowups — Applied 7d, Shortlisted 5d, interview±3d)
 * GET /api/applications/{id} (frontend: getApplicationById)
 * POST /api/applications (frontend: addApplication — manual tracker row)
 * POST /api/internships/{internshipId}/apply?userId= (frontend: board Apply — duplicate-guarded)
 * PUT /api/applications/{id} (frontend: updateApplication)
 * PATCH /api/applications/{id}/status (frontend: company/admin status updates)
 * DELETE /api/applications/{id} (frontend: deleteApplication)
 */
@RestController
public class ApplicationController {

  private final ApplicationService applications;
  private final AccessPolicy access;

  public ApplicationController(ApplicationService applications, AccessPolicy access) {
    this.applications = applications;
    this.access = access;
  }

  @GetMapping("/api/applications")
  public List<ApplicationResponse> list(
      @RequestParam(required = false) Long userId,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String q,
      @RequestParam(required = false, defaultValue = "false") boolean needsFollowup) {
    var who = access.identity();
    if ("user".equals(who.role())) {
      if (userId == null) userId = who.id();
      access.user(userId);
    } else if (!access.isAdmin() && userId != null) {
      access.deny();
    }
    List<Application> all = needsFollowup && userId != null
        ? applications.needsFollowup(userId)
        : "followup".equalsIgnoreCase(status) && userId != null
            ? applications.needsFollowup(userId)
            : applications.list(userId, status, q);
    var responses = all.stream().map(applications::toResponse);
    if ("company".equals(who.role())) responses = responses.filter(a -> who.id().equals(a.companyId()));
    return responses.toList();
  }

  @GetMapping("/api/applications/needs-followup")
  public List<ApplicationResponse> followups(@RequestParam Long userId) {
    access.user(userId);
    return applications.needsFollowup(userId).stream().map(applications::toResponse).toList();
  }

  @GetMapping("/api/applications/{id}")
  public ApplicationResponse get(@PathVariable Long id) {
    access.application(id, true);
    return applications.toResponse(applications.getById(id));
  }

  @PostMapping("/api/applications")
  public ResponseEntity<ApplicationResponse> create(@Valid @RequestBody ApplicationRequest req) {
    access.user(req.userId);
    return ResponseEntity.ok(applications.toResponse(applications.create(req)));
  }

  @PostMapping("/api/internships/{internshipId}/apply")
  public ResponseEntity<ApplicationResponse> apply(
      @PathVariable Long internshipId, @RequestParam Long userId) {
    access.user(userId);
    return ResponseEntity.ok(applications.toResponse(applications.applyToInternship(userId, internshipId)));
  }

  @PutMapping("/api/applications/{id}")
  public ResponseEntity<ApplicationResponse> update(@PathVariable Long id, @Valid @RequestBody ApplicationRequest req) {
    access.application(id, false);
    return ResponseEntity.ok(applications.toResponse(applications.update(id, req)));
  }

  @PatchMapping("/api/applications/{id}/status")
  public ResponseEntity<ApplicationResponse> setStatus(@PathVariable Long id, @Valid @RequestBody StatusPatch body) {
    access.application(id, true);
    return ResponseEntity.ok(applications.toResponse(applications.setStatus(id, body.status())));
  }

  @DeleteMapping("/api/applications/{id}")
  public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
    access.application(id, false);
    applications.delete(id);
    return ResponseEntity.ok(Map.of("message", "Application deleted"));
  }
}
