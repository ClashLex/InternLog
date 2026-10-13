package com.internlog.security;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.http.HttpMethod;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.web.cors.*;

/** Server-held browser sessions, CSRF protection, and optional bearer API access. */
@Configuration
public class SecurityConfig {

  @Value("${app.cors.allowed-origins:http://localhost:5500,http://127.0.0.1:5500,http://localhost:8080}")
  private String allowedOrigins;

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(java.util.Arrays.stream(allowedOrigins.split(","))
        .map(String::trim).filter(s -> !s.isEmpty()).toList());
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http, JwtFilter jwtFilter) throws Exception {
    http
        .csrf(csrf -> csrf.ignoringRequestMatchers(request -> {
          String header = request.getHeader("Authorization");
          return header != null && header.startsWith("Bearer ");
        }))
        .cors(cors -> {})
        .requestCache(cache -> cache.disable())
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register",
                "/api/companies/login", "/api/companies/register").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/internships/board").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/health", "/api/auth/csrf", "/api/auth/session").permitAll()
            .requestMatchers("/", "/*.html", "/user/**", "/company/**", "/admin/**", "/css/**", "/js/**").permitAll()
            .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/api-docs/**").permitAll()
            .requestMatchers("/api/admin/**").hasRole("ADMIN")
            .anyRequest().authenticated())
        .exceptionHandling(errors -> errors
            .authenticationEntryPoint((request, response, error) -> {
              response.setStatus(401);
              response.setContentType("application/json");
              response.getWriter().write("{\"message\":\"Please sign in to continue.\"}");
            })
            .accessDeniedHandler((request, response, error) -> {
              response.setStatus(403);
              response.setContentType("application/json");
              response.getWriter().write("{\"message\":\"You do not have permission for this action.\"}");
            }))
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
        .httpBasic(basic -> basic.disable())
        .formLogin(form -> form.disable())
        .logout(logout -> logout.disable());
    return http.build();
  }

  @Bean
  public FilterRegistrationBean<JwtFilter> jwtFilterRegistration(JwtFilter filter) {
    var registration = new FilterRegistrationBean<>(filter);
    registration.setEnabled(false);
    return registration;
  }
}
