package com.internlog.repository;

import com.internlog.model.Application;
import com.internlog.model.ApplicationStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
  List<Application> findByUserId(Long userId);
  List<Application> findByUserIdAndStatus(Long userId, ApplicationStatus status);
  Optional<Application> findByUserIdAndInternshipId(Long userId, Long internshipId);
  List<Application> findByInternshipId(Long internshipId);
  List<Application> findByCompanyId(Long companyId);
  void deleteByInternshipId(Long internshipId);
  void deleteByCompanyId(Long companyId);
  void deleteByUserId(Long userId);
}
