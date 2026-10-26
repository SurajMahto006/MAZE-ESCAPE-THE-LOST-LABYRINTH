package com.mazeescape;

import org.springframework.stereotype.Service;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameService {
    private final Map<String, GameState> games = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public GameState newGame(String difficulty) {
        int size = switch (difficulty == null ? "medium" : difficulty.toLowerCase()) {
            case "easy" -> 11;
            case "hard" -> 25;
            default -> 17;
        };
        if (size % 2 == 0) size++;
        GameState g = new GameState(size);
        for (int y = 0; y < size; y++) Arrays.fill(g.cells[y], 1);
        carve(g, 1, 1);
        g.playerX = 1; g.playerY = 1;
        g.exitX = size - 2; g.exitY = size - 2;
        List<int[]> open = new ArrayList<>();
        for (int y = 1; y < size - 1; y++) for (int x = 1; x < size - 1; x++) {
            if (g.cells[y][x] == 0 && !(x == 1 && y == 1) && !(x == g.exitX && y == g.exitY)) open.add(new int[]{x,y});
        }
        Collections.shuffle(open, random);
        int[] key = open.remove(0);
        g.keyX = key[0]; g.keyY = key[1];
        int trapCount = Math.min(4, Math.max(1, size / 7));
        for (int i = 0; i < trapCount && !open.isEmpty(); i++) {
            int[] t = open.remove(0);
            if (!(t[0] == g.keyX && t[1] == g.keyY)) g.traps.add(t[0] + "," + t[1]);
        }
        games.put(g.id, g);
        return g;
    }

    private void carve(GameState g, int x, int y) {
        g.cells[y][x] = 0;
        int[][] dirs = {{0,-2},{2,0},{0,2},{-2,0}};
        List<int[]> shuffled = new ArrayList<>(Arrays.asList(dirs));
        Collections.shuffle(shuffled, random);
        for (int[] d : shuffled) {
            int nx = x + d[0], ny = y + d[1];
            if (nx > 0 && ny > 0 && nx < g.size - 1 && ny < g.size - 1 && g.cells[ny][nx] == 1) {
                g.cells[y + d[1]/2][x + d[0]/2] = 0;
                carve(g, nx, ny);
            }
        }
    }

    public GameState get(String id) {
        GameState g = games.get(id);
        if (g == null) throw new IllegalArgumentException("Game not found. Start a new game.");
        return g;
    }

    public GameState move(String id, String direction) {
        GameState g = get(id);
        if (g.won || g.lives <= 0) return g;
        int nx = g.playerX, ny = g.playerY;
        switch (direction == null ? "" : direction.toLowerCase()) {
            case "up" -> ny--;
            case "down" -> ny++;
            case "left" -> nx--;
            case "right" -> nx++;
            default -> throw new IllegalArgumentException("Direction must be up, down, left or right.");
        }
        if (nx < 0 || ny < 0 || nx >= g.size || ny >= g.size || g.cells[ny][nx] == 1) return g;
        g.playerX = nx; g.playerY = ny; g.moves++;
        if (nx == g.keyX && ny == g.keyY && !g.hasKey) {
            g.hasKey = true; g.score += 100;
        }
        if (g.traps.remove(nx + "," + ny)) {
            g.lives--; g.score = Math.max(0, g.score - 25);
        } else {
            g.score += 1;
        }
        if (nx == g.exitX && ny == g.exitY && g.hasKey) {
            g.won = true; g.score += Math.max(0, 200 - g.moves);
        }
        return g;
    }
}
