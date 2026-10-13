package com.internlog.controller;

import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class HealthController {
  private final JdbcTemplate jdbc;
  public HealthController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  @GetMapping("/api/health")
  public ResponseEntity<Map<String, String>> health() {
    try {
      jdbc.queryForObject("SELECT 1", Integer.class);
      return ResponseEntity.ok(Map.of("status", "ready", "service", "InternLog"));
    } catch (org.springframework.dao.DataAccessException e) {
      return ResponseEntity.status(503).body(Map.of("message", "Backend database unavailable."));
    }
  }
}
