package com.internlog.service;

import com.internlog.dto.AuthDtos.*;
import com.internlog.model.User;
import java.util.List;

public interface UserService {
  User register(RegisterUserRequest req);
  User getById(Long id);
  List<User> list();
  User update(Long id, User patch);
  void delete(Long id);
  UserResponse toResponse(User user);
}
