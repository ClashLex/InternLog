package com.internlog.service;

import com.internlog.exception.BadRequestException;
import java.net.URI;

public final class RequestValidation {
  private RequestValidation() {}

  public static void httpUrl(String value) {
    if (value == null || value.isBlank()) return;
    try {
      URI uri = URI.create(value);
      if (!("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
          || uri.getHost() == null || uri.getUserInfo() != null) throw new IllegalArgumentException();
    } catch (IllegalArgumentException e) { throw new BadRequestException("Use a valid HTTP or HTTPS URL."); }
  }

  public static void email(String value) {
    if (value == null || !value.trim().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
      throw new BadRequestException("Enter a valid email address.");
    }
  }

  public static void nonBlank(String value, String field) {
    if (value == null || value.isBlank()) throw new BadRequestException(field + " is required.");
  }
}
