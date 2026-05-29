package com.pricehawl.repository;

import com.pricehawl.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    List<User> findByEmailContainingIgnoreCaseOrNameContainingIgnoreCase(String email, String name);
}