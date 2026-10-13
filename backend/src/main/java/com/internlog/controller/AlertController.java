package com.internlog.controller;

import com.internlog.dto.AuthDtos.SavedSearchResponse;
import com.internlog.dto.AuthDtos.InternshipResponse;
import com.internlog.model.Internship;
import com.internlog.model.SavedSearch;
import com.internlog.service.AlertService;
import com.internlog.service.InternshipService;
import com.internlog.security.AccessPolicy;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * GET /api/alerts?userId= (frontend: getSavedSearches)
 * POST /api/alerts?userId= (frontend: saveSearch)
 * DELETE /api/alerts/{id} (frontend: deleteSavedSearch)
 * GET /api/alerts/matches?userId= (frontend: getMatchedAlerts — Published only)
 */
@RestController
@RequestMapping("/api/alerts")
public class AlertController {

  private final AlertService alerts;
  private final InternshipService internships;
  private final AccessPolicy access;

  public AlertController(AlertService alerts, InternshipService internships, AccessPolicy access) {
    this.alerts = alerts;
    this.internships = internships;
    this.access = access;
  }

  @GetMapping
  public List<SavedSearchResponse> list(@RequestParam Long userId) {
    access.user(userId);
    return alerts.list(userId).stream().map(s -> new SavedSearchResponse(
        s.getId(), s.getUser().getId(), s.getQuery(), s.getLocation(),
        s.getType(), s.getMinStipend(),
        s.getCreatedAt() != null ? s.getCreatedAt().toString() : null)).toList();
  }

  @PostMapping
  public ResponseEntity<SavedSearchResponse> save(@RequestParam Long userId,
      @RequestBody Map<String, Object> body) {
    access.user(userId);
    SavedSearch s = alerts.save(userId,
        body.get("query") != null ? String.valueOf(body.get("query")) : "",
        body.get("location") != null ? String.valueOf(body.get("location")) : "",
        body.get("type") != null ? String.valueOf(body.get("type")) : "",
        body.get("minStipend") != null ? Integer.parseInt(String.valueOf(body.get("minStipend"))) : 0);
    return ResponseEntity.ok(new SavedSearchResponse(
        s.getId(), userId, s.getQuery(), s.getLocation(), s.getType(),
        s.getMinStipend(), s.getCreatedAt() != null ? s.getCreatedAt().toString() : null));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
    access.alert(id);
    alerts.delete(id);
    return ResponseEntity.ok(Map.of("message", "Alert removed"));
  }

  @GetMapping("/matches")
  public List<InternshipResponse> matches(@RequestParam Long userId) {
    access.user(userId);
    List<Internship> published = internships.publicBoard();
    return alerts.matchesFor(userId, published).stream().map(internships::toResponse).toList();
  }
}
