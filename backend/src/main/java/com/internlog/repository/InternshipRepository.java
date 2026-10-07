package com.internlog.repository;

import com.internlog.model.Internship;
import com.internlog.model.InternshipStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InternshipRepository extends JpaRepository<Internship, Long> {
  List<Internship> findByCompanyId(Long companyId);
  List<Internship> findByStatus(InternshipStatus status);
  List<Internship> findByStatusOrderByCreatedAtDesc(InternshipStatus status);
}
