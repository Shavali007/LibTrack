package com.libtrack;

import java.util.Arrays;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;

@SpringBootApplication
public class LibTrackApplication {
    private static final String LIBRARIAN_BOOTSTRAP = "--libtrack.bootstrap-librarian";

    public static void main(String[] args) {
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
}
