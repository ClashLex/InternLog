package com.internlog.controller;

import com.internlog.dto.AuthDtos.UserResponse;
import com.internlog.model.ApplicationStatus;
import com.internlog.model.CompanyStatus;
import com.internlog.model.InternshipStatus;
import com.internlog.repository.*;
import java.util.*;
import org.springframework.web.bind.annotation.*;

/**
 * GET /api/admin/dashboard — system stats for admin/dashboard.html
 * (frontend: initAdminDashboard — totals + status breakdown + recent activity
 * is derived client-side from /api/users + /api/applications).
 */
@RestController
@RequestMapping("/api/admin")
@CrossOrigin
public class AdminController {

  private final UserRepository users;
  private final CompanyRepository companies;
  private final InternshipRepository internships;
  private final ApplicationRepository applications;

  public AdminController(UserRepository users, CompanyRepository companies,
      InternshipRepository internships, ApplicationRepository applications) {
    this.users = users;
    this.companies = companies;
    this.internships = internships;
    this.applications = applications;
  }

  @GetMapping("/dashboard")
  public Map<String, Object> dashboard() {
    Map<String, Object> stats = new LinkedHashMap<>();
    stats.put("totalStudents", users.count());
    stats.put("totalCompanies", companies.count());
    stats.put("pendingCompanies", companies.findByStatus(CompanyStatus.Pending).size());
    stats.put("totalInternships", internships.count());
    stats.put("pendingInternships", internships.findByStatus(InternshipStatus.Pending_Review).size());
    stats.put("publishedInternships", internships.findByStatus(InternshipStatus.Published).size());
    stats.put("totalApplications", applications.count());
    Map<String, Long> byStatus = new LinkedHashMap<>();
    for (ApplicationStatus status : ApplicationStatus.values()) {
      byStatus.put(status.name(), applications.findAll().stream()
          .filter(a -> a.getStatus() == status).count());
    }
    stats.put("applicationsByStatus", byStatus);
    return stats;
  }

  @GetMapping("/users")
  public List<UserResponse> adminUsers() {
    return users.findAll().stream().map(u -> new UserResponse(
        u.getId(), u.getName(), u.getEmail(), u.getCollege(), u.getCourse(),
        u.getGradYear(), u.getRegisteredDate() != null ? u.getRegisteredDate().toString() : null,
        u.getStatus())).toList();
  }
}
