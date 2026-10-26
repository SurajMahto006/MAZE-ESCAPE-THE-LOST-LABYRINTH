package com.mazeescape;

import java.util.*;

public class GameState {
    public final String id = UUID.randomUUID().toString();
    public final int size;
    public int[][] cells; // 0=open, 1=wall
    public int playerX = 1, playerY = 1;
    public int keyX, keyY, exitX, exitY;
    public boolean hasKey = false, won = false;
    public int moves = 0, score = 0, lives = 3;
    public final Set<String> traps = new HashSet<>();

    GameState(int size) {
        this.size = size;
        this.cells = new int[size][size];
    }

    public Map<String, Object> toMap() {
        List<List<Integer>> grid = new ArrayList<>();
        for (int[] row : cells) {
            List<Integer> r = new ArrayList<>();
            for (int c : row) r.add(c);
            grid.add(r);
        }
        List<List<Integer>> trapList = new ArrayList<>();
        for (String trap : traps) {
            String[] p = trap.split(",");
            trapList.add(List.of(Integer.parseInt(p[0]), Integer.parseInt(p[1])));
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id); m.put("size", size); m.put("grid", grid);
        m.put("player", List.of(playerX, playerY));
        m.put("key", List.of(keyX, keyY)); m.put("exit", List.of(exitX, exitY));
        m.put("traps", trapList); m.put("hasKey", hasKey); m.put("won", won);
        m.put("moves", moves); m.put("score", score); m.put("lives", lives);
        return m;
    }
}
