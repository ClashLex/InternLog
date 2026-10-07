package com.internlog;

import com.internlog.model.InternshipStatus;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class InternshipStatusTest {
  @Test
  void parsesFrontendLabels() {
    assertEquals(InternshipStatus.Pending_Review, InternshipStatus.fromString("Pending Review"));
    assertEquals(InternshipStatus.Pending_Review, InternshipStatus.fromString("Pending_Review"));
    assertEquals("Pending Review", InternshipStatus.Pending_Review.toFrontend());
  }
}
