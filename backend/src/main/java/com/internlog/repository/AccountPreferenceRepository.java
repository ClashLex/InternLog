package com.internlog.repository;

import com.internlog.model.AccountPreference;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountPreferenceRepository extends JpaRepository<AccountPreference, Long> {
  List<AccountPreference> findByAccountRoleAndAccountId(String role, Long id);
  Optional<AccountPreference> findByAccountRoleAndAccountIdAndName(String role, Long id, String name);
  void deleteByAccountRoleAndAccountId(String role, Long id);
}
