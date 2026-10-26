package com.mazeescape;

import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class GameController {
    private final GameService service;
    public GameController(GameService service) { this.service = service; }

    @PostMapping("/new")
    public Map<String, Object> newGame(@RequestBody(required = false) Map<String, String> body) {
        String difficulty = body == null ? "medium" : body.getOrDefault("difficulty", "medium");
        return service.newGame(difficulty).toMap();
    }

    @GetMapping("/state/{id}")
    public Map<String, Object> state(@PathVariable String id) {
        return service.get(id).toMap();
    }

    @PostMapping("/move/{id}")
    public Map<String, Object> move(@PathVariable String id, @RequestBody Map<String, String> body) {
        return service.move(id, body.get("direction")).toMap();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(org.springframework.http.HttpStatus.BAD_REQUEST)
    public Map<String, String> badRequest(IllegalArgumentException ex) {
        return Map.of("error", ex.getMessage());
    }
}
