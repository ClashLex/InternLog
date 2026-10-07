package com.internlog.controller;

import com.internlog.dto.AuthDtos.UserResponse;
import com.internlog.model.User;
import com.internlog.service.UserService;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * GET /api/users — admin monitoring (frontend: getUsers)
 * GET /api/users/{id} (frontend: getUserById)
 * PUT /api/users/{id} (frontend: updateUser — profile + admin enable/disable)
 * DELETE /api/users/{id} (frontend: deleteUser — cascades applications)
 */
@RestController
@RequestMapping("/api/users")
@CrossOrigin
public class UserController {

  private final UserService users;

  public UserController(UserService users) {
    this.users = users;
  }

  @GetMapping
  public List<UserResponse> list() {
    return users.list().stream().map(users::toResponse).toList();
  }

  @GetMapping("/{id}")
  public UserResponse get(@PathVariable Long id) {
    return users.toResponse(users.getById(id));
  }

  @PutMapping("/{id}")
  public UserResponse update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
    User patch = new User();
    if (body.get("name") != null) patch.setName(String.valueOf(body.get("name")));
    if (body.get("college") != null) patch.setCollege(String.valueOf(body.get("college")));
    if (body.get("course") != null) patch.setCourse(String.valueOf(body.get("course")));
    if (body.get("gradYear") != null) patch.setGradYear(String.valueOf(body.get("gradYear")));
    if (body.get("status") != null) patch.setStatus(String.valueOf(body.get("status")));
    return users.toResponse(users.update(id, patch));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
    users.delete(id);
    return ResponseEntity.ok(Map.of("message", "User deleted"));
  }
}
