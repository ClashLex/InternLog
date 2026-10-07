package com.internlog.repository;

import com.internlog.model.Company;
import com.internlog.model.CompanyStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyRepository extends JpaRepository<Company, Long> {
  Optional<Company> findByEmailIgnoreCase(String email);
  boolean existsByEmailIgnoreCase(String email);
  List<Company> findByStatus(CompanyStatus status);
}
