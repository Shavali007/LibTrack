package com.libtrack;

import java.util.Arrays;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class LibTrackApplication {
    private static final String LIBRARIAN_BOOTSTRAP = "--libtrack.bootstrap-librarian";

    public static void main(String[] args) {
        loadDotEnvIfPresent();
        boolean bootstrapMode = Arrays.stream(args).anyMatch(argument ->
                argument.equals(LIBRARIAN_BOOTSTRAP)
                        || argument.equals(LIBRARIAN_BOOTSTRAP + "=true"));
        SpringApplication application = new SpringApplication(LibTrackApplication.class);
        if (bootstrapMode) {
            application.setWebApplicationType(WebApplicationType.NONE);
        }
        ConfigurableApplicationContext context = application.run(args);
        if (bootstrapMode) {
            context.close();
        }
    }

    private static void loadDotEnvIfPresent() {
        java.nio.file.Path[] candidates = new java.nio.file.Path[] {
            java.nio.file.Paths.get(".env"),
            java.nio.file.Paths.get("..", ".env"),
            java.nio.file.Paths.get("backend", ".env")
        };
        for (java.nio.file.Path path : candidates) {
            if (java.nio.file.Files.isRegularFile(path)) {
                try (java.io.BufferedReader reader = java.nio.file.Files.newBufferedReader(path, java.nio.charset.StandardCharsets.UTF_8)) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) {
                            continue;
                        }
                        int eq = line.indexOf('=');
                        if (eq > 0) {
                            String key = line.substring(0, eq).trim();
                            String val = line.substring(eq + 1).trim();
                            if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
                                val = val.substring(1, val.length() - 1);
                            }
                            if (System.getProperty(key) == null && System.getenv(key) == null) {
                                System.setProperty(key, val);
                            }
                        }
                    }
                } catch (Exception ignored) {}
                break;
            }
        }
    }
}
