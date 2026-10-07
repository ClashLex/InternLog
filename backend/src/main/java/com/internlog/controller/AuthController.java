package com.internlog.controller;

import com.internlog.dto.AuthDtos.*;
import com.internlog.model.User;
import com.internlog.service.AuthService;
import com.internlog.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * POST /api/auth/register — student registration (frontend: registerUser)
 * POST /api/auth/login — student login, incl. prototype admin fallback (frontend: loginUser)
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {

  private final UserService users;
  private final AuthService auth;

  public AuthController(UserService users, AuthService auth) {
    this.users = users;
    this.auth = auth;
  }

  @PostMapping("/register")
  public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterUserRequest req) {
    User user = users.register(req);
    return ResponseEntity.ok(users.toResponse(user));
  }

  @PostMapping("/login")
  public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
    return ResponseEntity.ok(auth.loginUser(req));
  }
}
