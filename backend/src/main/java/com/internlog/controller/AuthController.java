package com.internlog.controller;

import com.internlog.dto.AuthDtos.*;
import com.internlog.model.User;
import com.internlog.service.AuthService;
import com.internlog.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.web.csrf.CsrfToken;
import com.internlog.security.SessionIdentity;
import com.internlog.service.CompanyService;
import java.util.Map;

/**
 * POST /api/auth/register — student registration (frontend: registerUser)
 * Java-held browser sessions with CSRF protection; bearer tokens also support API clients.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final UserService users;
  private final AuthService auth;
  private final CompanyService companies;

  public AuthController(UserService users, AuthService auth, CompanyService companies) {
    this.users = users;
    this.auth = auth;
    this.companies = companies;
  }

  @PostMapping("/register")
  public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterUserRequest req) {
    User user = users.register(req);
    return ResponseEntity.ok(users.toResponse(user));
  }

  @PostMapping("/login")
  public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req, HttpServletRequest request) {
    AuthResponse result = auth.loginUser(req);
    establishSession(request, result);
    return ResponseEntity.ok(result);
  }

  public static void establishSession(HttpServletRequest request, AuthResponse result) {
    request.getSession(true);
    request.changeSessionId();
    request.getSession().setAttribute("internlog.identity", new SessionIdentity(result.role(), result.userId()));
  }

  @GetMapping("/csrf")
  public Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
  }

  @GetMapping("/session")
  public ResponseEntity<?> session() {
    var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !(authentication.getPrincipal() instanceof SessionIdentity who)) {
      return ResponseEntity.status(401).body(Map.of("message", "Please sign in to continue."));
    }
    if ("user".equals(who.role())) {
      var user = users.getById(who.id());
      return ResponseEntity.ok(new AuthResponse(null, "user", user.getId(), user.getName(), user.getEmail()));
    }
    if ("company".equals(who.role())) {
      var company = companies.getById(who.id());
      return ResponseEntity.ok(new AuthResponse(null, "company", company.getId(), company.getName(), company.getEmail()));
    }
    return ResponseEntity.ok(new AuthResponse(null, "admin", 0L, "InternLog Admin", auth.adminEmail()));
  }

  @PostMapping("/logout")
  public Map<String, String> logout(HttpServletRequest request) {
    var session = request.getSession(false);
    if (session != null) session.invalidate();
    org.springframework.security.core.context.SecurityContextHolder.clearContext();
    return Map.of("message", "Signed out.");
  }
}
