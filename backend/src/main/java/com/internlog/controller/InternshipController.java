package com.internlog.controller;

import com.internlog.dto.AuthDtos.*;
import com.internlog.dto.InternshipRequest;
import com.internlog.model.Internship;
import com.internlog.service.InternshipService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * GET /api/internships (frontend: getInternships; filters: status, companyId, q)
 * GET /api/internships/board (frontend: getPublicInternships — Published + approved + not expired)
 * GET /api/internships/{id} (frontend: getInternshipById)
 * POST /api/internships (frontend: addInternship)
 * PUT /api/internships/{id} (frontend: updateInternship — company edit resubmits for review)
 * PATCH /api/internships/{id}/status (frontend: approve/reject/archive — admin)
 * DELETE /api/internships/{id} (frontend: deleteInternship — cascades applications)
 */
@RestController
@RequestMapping("/api/internships")
@CrossOrigin
public class InternshipController {

  private final InternshipService internships;

  public InternshipController(InternshipService internships) {
    this.internships = internships;
  }

  @GetMapping
  public List<InternshipResponse> list(
      @RequestParam(required = false) String status,
      @RequestParam(required = false) Long companyId,
      @RequestParam(required = false) String q) {
    return internships.list(status, companyId, q).stream().map(internships::toResponse).toList();
  }

  @GetMapping("/board")
  public List<InternshipResponse> board() {
    return internships.publicBoard().stream().map(internships::toResponse).toList();
  }

  @GetMapping("/{id}")
  public InternshipResponse get(@PathVariable Long id) {
    return internships.toResponse(internships.getById(id));
  }

  @PostMapping
  public ResponseEntity<InternshipResponse> create(@Valid @RequestBody InternshipRequest req) {
    Internship job = internships.create(req);
    return ResponseEntity.ok(internships.toResponse(job));
  }

  @PutMapping("/{id}")
  public ResponseEntity<InternshipResponse> update(@PathVariable Long id, @RequestBody InternshipRequest req) {
    return ResponseEntity.ok(internships.toResponse(internships.update(id, req)));
  }

  @PatchMapping("/{id}/status")
  public ResponseEntity<InternshipResponse> setStatus(@PathVariable Long id, @RequestBody StatusPatch body) {
    return ResponseEntity.ok(internships.toResponse(internships.setStatus(id, body.status())));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
    internships.delete(id);
    return ResponseEntity.ok(Map.of("message", "Internship deleted"));
  }
}
