package com.internlog.security;

import com.internlog.repository.CompanyRepository;
import com.internlog.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtFilter extends OncePerRequestFilter {
  private final JwtUtil jwt;
  private final UserRepository users;
  private final CompanyRepository companies;

  public JwtFilter(JwtUtil jwt, UserRepository users, CompanyRepository companies) {
    this.jwt = jwt;
    this.users = users;
    this.companies = companies;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI().substring(request.getContextPath().length());
    return !path.startsWith("/api/") || java.util.Set.of("/api/health", "/api/auth/csrf",
        "/api/auth/login", "/api/auth/register", "/api/companies/login", "/api/companies/register").contains(path);
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain chain) throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    var session = request.getSession(false);
    SessionIdentity stored = session == null ? null : (SessionIdentity) session.getAttribute("internlog.identity");
    if ((header != null && header.startsWith("Bearer ")) || stored != null) {
      try {
        String role;
        Long id;
        if (header != null && header.startsWith("Bearer ")) {
          Claims claims = jwt.verify(header.substring(7));
          role = claims.get("role", String.class);
          id = ((Number) claims.get("userId")).longValue();
        } else {
          role = stored.role();
          id = stored.id();
        }
        boolean active = switch (role) {
          case "admin" -> id == 0;
          case "user" -> users.findById(id).map(u -> "Active".equals(u.getStatus())).orElse(false);
          case "company" -> companies.findById(id).map(c -> c.isApproved()).orElse(false);
          default -> false;
        };
        if (!active) throw new IllegalArgumentException("Account unavailable");
        var auth = new UsernamePasswordAuthenticationToken(new SessionIdentity(role, id), null,
            List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase())));
        SecurityContextHolder.getContext().setAuthentication(auth);
      } catch (JwtException | IllegalArgumentException | NullPointerException | ClassCastException e) {
        SecurityContextHolder.clearContext();
        if (session != null) session.invalidate();
        response.setStatus(401);
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"Session expired or invalid. Please sign in again.\"}");
        return;
      }
    }
    chain.doFilter(request, response);
  }
}
