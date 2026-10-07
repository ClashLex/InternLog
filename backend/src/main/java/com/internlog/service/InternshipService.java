package com.internlog.service;

import com.internlog.dto.AuthDtos.InternshipResponse;
import com.internlog.dto.InternshipRequest;
import com.internlog.model.Internship;
import java.util.List;

public interface InternshipService {
  Internship create(InternshipRequest req);
  Internship getById(Long id);
  List<Internship> list(String status, Long companyId, String query);
  List<Internship> publicBoard();
  Internship update(Long id, InternshipRequest req);
  Internship setStatus(Long id, String status);
  void delete(Long id);
  InternshipResponse toResponse(Internship job);
}
