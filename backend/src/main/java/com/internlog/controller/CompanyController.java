package com.internlog.controller;

import com.internlog.dto.AuthDtos.*;
import com.internlog.model.Company;
import com.internlog.repository.InternshipRepository;
import com.internlog.service.AuthService;
import com.internlog.service.CompanyService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * POST /api/companies/register (frontend: registerCompany)
 * POST /api/companies/login (frontend: loginCompany)
 * GET /api/companies (frontend: getCompanies)
 * GET /api/companies/{id} (frontend: getCompanyById)
 * PUT /api/companies/{id} (frontend: updateCompany — profile)
 * PATCH /api/companies/{id}/status (frontend: verify/reject/suspend/restore)
 * DELETE /api/companies/{id} (frontend: deleteCompany — cascades)
 */
@RestController
@RequestMapping("/api/companies")
@CrossOrigin
public class CompanyController {

  private final CompanyService companies;
  private final AuthService auth;
  private final InternshipRepository internships;

  public CompanyController(CompanyService companies, AuthService auth, InternshipRepository internships) {
    this.companies = companies;
    this.auth = auth;
    this.internships = internships;
  }

  @PostMapping("/register")
  public ResponseEntity<CompanyResponse> register(@Valid @RequestBody RegisterCompanyRequest req) {
    Company company = companies.register(req);
    return ResponseEntity.ok(companies.toResponse(company, 0));
  }

  @PostMapping("/login")
  public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
    return ResponseEntity.ok(auth.loginCompany(req));
  }

  @GetMapping
  public List<CompanyResponse> list() {
    return companies.list().stream()
        .map(c -> companies.toResponse(c, internships.findByCompanyId(c.getId()).size()))
        .toList();
  }

  @GetMapping("/{id}")
  public CompanyResponse get(@PathVariable Long id) {
    Company company = companies.getById(id);
    return companies.toResponse(company, internships.findByCompanyId(id).size());
  }

  @PutMapping("/{id}")
  public ResponseEntity<CompanyResponse> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
    Company patch = new Company();
    if (body.get("name") != null) patch.setName(String.valueOf(body.get("name")));
    if (body.get("email") != null) patch.setEmail(String.valueOf(body.get("email")));
    if (body.get("website") != null) patch.setWebsite(String.valueOf(body.get("website")));
    if (body.get("location") != null) patch.setLocation(String.valueOf(body.get("location")));
    if (body.get("industry") != null) patch.setIndustry(String.valueOf(body.get("industry")));
    if (body.get("description") != null) patch.setDescription(String.valueOf(body.get("description")));
    Company updated = companies.update(id, patch);
    return ResponseEntity.ok(companies.toResponse(updated, internships.findByCompanyId(id).size()));
  }

  @PatchMapping("/{id}/status")
  public ResponseEntity<CompanyResponse> setStatus(@PathVariable Long id, @RequestBody StatusPatch body) {
    Company updated = companies.setStatus(id, body.status());
    return ResponseEntity.ok(companies.toResponse(updated, internships.findByCompanyId(id).size()));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
    companies.delete(id);
    return ResponseEntity.ok(Map.of("message", "Company deleted"));
  }
}
