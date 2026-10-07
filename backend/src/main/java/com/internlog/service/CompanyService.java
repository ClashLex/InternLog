package com.internlog.service;

import com.internlog.dto.AuthDtos.*;
import com.internlog.model.Company;
import java.util.List;

public interface CompanyService {
  Company register(RegisterCompanyRequest req);
  Company getById(Long id);
  List<Company> list();
  Company update(Long id, Company patch);
  Company setStatus(Long id, String status);
  void delete(Long id);
  /** Verify current password (BCrypt) then store the new one hashed. */
  void changePassword(Long id, String currentRaw, String newRaw);
  CompanyResponse toResponse(Company company, long internshipCount);
}
