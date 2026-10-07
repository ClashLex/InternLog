package com.internlog.service.impl;

import com.internlog.dto.AuthDtos.*;
import com.internlog.exception.*;
import com.internlog.model.Company;
import com.internlog.model.CompanyStatus;
import com.internlog.repository.ApplicationRepository;
import com.internlog.repository.CompanyRepository;
import com.internlog.repository.InternshipRepository;
import com.internlog.service.CompanyService;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CompanyServiceImpl implements CompanyService {

  private final CompanyRepository companies;
  private final InternshipRepository internships;
  private final ApplicationRepository applications;
  private final PasswordEncoder passwords;

  public CompanyServiceImpl(CompanyRepository companies, InternshipRepository internships,
      ApplicationRepository applications, PasswordEncoder passwords) {
    this.companies = companies;
    this.internships = internships;
    this.applications = applications;
    this.passwords = passwords;
  }

  @Override
  @Transactional
  public Company register(RegisterCompanyRequest req) {
    if (companies.existsByEmailIgnoreCase(req.email())) {
      throw new BadRequestException("A company account with this email already exists.");
    }
    Company company = new Company();
    company.setName(req.name().trim());
    company.setEmail(req.email().trim().toLowerCase());
    company.setPasswordHash(passwords.encode(req.password()));
    company.setWebsite(req.website());
    company.setLocation(req.location());
    company.setIndustry(req.industry());
    company.setDescription(req.description());
    company.setStatus(CompanyStatus.Pending);
    company.setVerified(false);
    company.setApprovalStatus("Pending");
    return companies.save(company);
  }

  @Override
  public Company getById(Long id) {
    return companies.findById(id).orElseThrow(() -> new NotFoundException("Company not found."));
  }

  @Override
  public List<Company> list() {
    return companies.findAll();
  }

  @Override
  @Transactional
  public Company update(Long id, Company patch) {
    Company company = getById(id);
    if (patch.getName() != null) company.setName(patch.getName());
    if (patch.getWebsite() != null) company.setWebsite(patch.getWebsite());
    if (patch.getLocation() != null) company.setLocation(patch.getLocation());
    if (patch.getIndustry() != null) company.setIndustry(patch.getIndustry());
    if (patch.getDescription() != null) company.setDescription(patch.getDescription());
    if (patch.getEmail() != null && !patch.getEmail().equalsIgnoreCase(company.getEmail())) {
      if (companies.existsByEmailIgnoreCase(patch.getEmail())) {
        throw new BadRequestException("Another company already uses this email.");
      }
      company.setEmail(patch.getEmail().trim().toLowerCase());
    }
    return companies.save(company);
  }

  @Override
  @Transactional
  public void changePassword(Long id, String currentRaw, String newRaw) {
    Company company = getById(id);
    if (currentRaw == null || !passwords.matches(currentRaw, company.getPasswordHash())) {
      throw new BadRequestException("Current password is incorrect.");
    }
    if (newRaw == null || newRaw.length() < 8) {
      throw new BadRequestException("New password must be at least 8 characters.");
    }
    company.setPasswordHash(passwords.encode(newRaw));
    companies.save(company);
  }

  @Override
  @Transactional
  public Company setStatus(Long id, String status) {
    Company company = getById(id);
    String normalized = status.trim();
    switch (normalized.toLowerCase()) {
      case "verify", "verified", "active", "approved", "restore" -> {
        company.setStatus(CompanyStatus.Active);
        company.setVerified(true);
        company.setApprovalStatus("Approved");
      }
      case "reject", "rejected" -> {
        company.setStatus(CompanyStatus.Rejected);
        company.setVerified(false);
        company.setApprovalStatus("Rejected");
      }
      case "suspend", "suspended" -> company.setStatus(CompanyStatus.Suspended);
      case "pending" -> {
        company.setStatus(CompanyStatus.Pending);
        company.setVerified(false);
        company.setApprovalStatus("Pending");
      }
      default -> throw new BadRequestException("Unknown company status: " + status);
    }
    return companies.save(company);
  }

  @Override
  @Transactional
  public void delete(Long id) {
    getById(id);
    applications.deleteByCompanyId(id);
    internships.findByCompanyId(id).forEach(job -> {
      applications.deleteByInternshipId(job.getId());
    });
    internships.findByCompanyId(id).forEach(job -> internships.deleteById(job.getId()));
    companies.deleteById(id);
  }

  @Override
  public CompanyResponse toResponse(Company company, long internshipCount) {
    return new CompanyResponse(
        company.getId(), company.getName(), company.getEmail(), company.getWebsite(),
        company.getLocation(), company.getIndustry(), company.getDescription(),
        company.getStatus().name(), company.isVerified(), company.getApprovalStatus(),
        internshipCount);
  }
}
