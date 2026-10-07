package com.internlog.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Minimal JWT issuer for student/company sessions. Prototype-grade. */
@Component
public class JwtUtil {

  private final SecretKey key;
  private final long expiryMs;

  public JwtUtil(
      @Value("${app.jwt.secret:internlog-dev-secret-key-change-me-32chars!!}") String secret,
      @Value("${app.jwt.expiry-ms:86400000}") long expiryMs) {
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expiryMs = expiryMs;
  }

  public String issue(String role, Long userId, String email) {
    long now = System.currentTimeMillis();
    return Jwts.builder()
        .subject(role + ":" + userId)
        .claim("role", role)
        .claim("userId", userId)
        .claim("email", email)
        .issuedAt(new Date(now))
        .expiration(new Date(now + expiryMs))
        .signWith(key)
        .compact();
  }
}
