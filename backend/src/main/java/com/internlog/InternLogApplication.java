package com.internlog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class InternLogApplication {
  public static void main(String[] args) {
    if (java.util.Arrays.asList(args).contains("--hash-admin-password")) {
      java.io.Console console = System.console();
      if (console == null) throw new IllegalStateException("Run this command in an interactive terminal.");
      char[] password = console.readPassword("Admin password (12+ characters): ");
      if (password == null || password.length < 12) throw new IllegalArgumentException("Use at least 12 characters.");
      try {
        System.out.println(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode(new String(password)));
      } finally { java.util.Arrays.fill(password, '\0'); }
      return;
    }
    SpringApplication.run(InternLogApplication.class, args);
  }
}
