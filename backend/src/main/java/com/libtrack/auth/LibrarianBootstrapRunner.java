package com.libtrack.auth;

import java.io.Console;
import java.util.Arrays;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;
import org.springframework.web.context.WebApplicationContext;

@Component
public class LibrarianBootstrapRunner implements ApplicationRunner {
    private final LibrarianBootstrapService bootstrapService;
    private final ApplicationContext applicationContext;

    public LibrarianBootstrapRunner(LibrarianBootstrapService bootstrapService,
                                    ApplicationContext applicationContext) {
        this.bootstrapService = bootstrapService;
        this.applicationContext = applicationContext;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!args.containsOption("libtrack.bootstrap-librarian")) {
            return;
        }
        if (applicationContext instanceof WebApplicationContext) {
            throw new IllegalStateException("Librarian bootstrap must run without an HTTP server.");
        }

        Console console = System.console();
        if (console == null) {
            throw new IllegalStateException("Run the one-time Librarian bootstrap from an interactive terminal.");
        }

        String email = console.readLine("Initial Librarian email: ");
        char[] password = console.readPassword("Choose a password (input hidden): ");
        char[] confirmation = console.readPassword("Confirm password (input hidden): ");
        try {
            if (password == null || confirmation == null || !Arrays.equals(password, confirmation)) {
                throw new IllegalArgumentException("Password confirmation did not match.");
            }
            bootstrapService.createInitialLibrarian(email, new String(password));
            console.writer().println("Initial Librarian account created. The password was not displayed or logged.");
        } finally {
            if (password != null) Arrays.fill(password, '\0');
            if (confirmation != null) Arrays.fill(confirmation, '\0');
        }
    }
}
