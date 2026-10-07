package com.internlog.repository;

import com.internlog.model.SavedSearch;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavedSearchRepository extends JpaRepository<SavedSearch, Long> {
  List<SavedSearch> findByUserId(Long userId);
}
