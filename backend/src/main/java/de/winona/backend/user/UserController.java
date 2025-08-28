package de.winona.backend.user;

import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository repo;

    public UserController(UserRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<User> all() {
        return repo.findAll();
    }

    @PostMapping
    public User create(@RequestBody User user) {
        return repo.save(user);
    }

    @GetMapping("/{id}")
    public User one(@PathVariable UUID id) {
        return repo.findById(id).orElseThrow();
    }

    @GetMapping("/exists/{username}")
    public boolean exists(@PathVariable String username) {
        return repo.existsByUsername(username);
    }
}
