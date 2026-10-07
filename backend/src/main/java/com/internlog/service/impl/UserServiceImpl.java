package com.internlog.service.impl;

import com.internlog.dto.AuthDtos.*;
import com.internlog.exception.*;
import com.internlog.model.User;
import com.internlog.repository.ApplicationRepository;
import com.internlog.repository.UserRepository;
import com.internlog.service.UserService;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserServiceImpl implements UserService {

  private final UserRepository users;
  private final ApplicationRepository applications;
  private final PasswordEncoder passwords;

  public UserServiceImpl(UserRepository users, ApplicationRepository applications, PasswordEncoder passwords) {
    this.users = users;
    this.applications = applications;
    this.passwords = passwords;
  }

  @Override
  @Transactional
  public User register(RegisterUserRequest req) {
    if (users.existsByEmailIgnoreCase(req.email())) {
      throw new BadRequestException("An account with this email already exists.");
    }
    User user = new User();
    user.setName(req.name().trim());
    user.setEmail(req.email().trim().toLowerCase());
    user.setPasswordHash(passwords.encode(req.password()));
    user.setCollege(req.college());
    user.setCourse(req.course());
    user.setGradYear(req.gradYear());
    user.setStatus("Active");
    return users.save(user);
  }

  @Override
  public User getById(Long id) {
    return users.findById(id).orElseThrow(() -> new NotFoundException("User not found."));
  }

  @Override
  public List<User> list() {
    return users.findAll();
  }

  @Override
  @Transactional
  public User update(Long id, User patch) {
    User user = getById(id);
    if (patch.getName() != null) user.setName(patch.getName());
    if (patch.getCollege() != null) user.setCollege(patch.getCollege());
    if (patch.getCourse() != null) user.setCourse(patch.getCourse());
    if (patch.getGradYear() != null) user.setGradYear(patch.getGradYear());
    if (patch.getStatus() != null) user.setStatus(patch.getStatus());
    return users.save(user);
  }

  @Override
  @Transactional
  public void changePassword(Long id, String currentRaw, String newRaw) {
    User user = getById(id);
    if (currentRaw == null || !passwords.matches(currentRaw, user.getPasswordHash())) {
      throw new BadRequestException("Current password is incorrect.");
    }
    if (newRaw == null || newRaw.length() < 8) {
      throw new BadRequestException("New password must be at least 8 characters.");
    }
    user.setPasswordHash(passwords.encode(newRaw));
    users.save(user);
  }

  @Override
  @Transactional
  public void delete(Long id) {
    getById(id);
    applications.deleteByUserId(id);
    users.deleteById(id);
  }

  @Override
  public UserResponse toResponse(User user) {
    return new UserResponse(
        user.getId(), user.getName(), user.getEmail(), user.getCollege(),
        user.getCourse(), user.getGradYear(),
        user.getRegisteredDate() != null ? user.getRegisteredDate().toString() : null,
        user.getStatus());
  }
}
