package com.internlog.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Signed, expiring tokens. An unset secret generates a new key on each restart. */
@Component
public class JwtUtil {

  private final SecretKey key;
  private final long expiryMs;

  public JwtUtil(
      @Value("${app.jwt.secret:}") String secret,
      @Value("${app.jwt.expiry-ms:86400000}") long expiryMs) {
    this.key = secret.isBlank() ? Jwts.SIG.HS256.key().build()
        : Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expiryMs = expiryMs;
  }

  public Claims verify(String token) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
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
