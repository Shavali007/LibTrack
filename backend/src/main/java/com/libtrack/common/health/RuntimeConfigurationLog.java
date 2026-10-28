package com.libtrack.common.health;

import java.net.URI;
import java.util.Arrays;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/** Logs only active profiles and non-secret datasource coordinates at startup. */
@Component
public class RuntimeConfigurationLog implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(RuntimeConfigurationLog.class);
    private final String datasourceUrl;
    private final Environment environment;

    public RuntimeConfigurationLog(@Value("${spring.datasource.url}") String datasourceUrl, Environment environment) {
        this.datasourceUrl = datasourceUrl;
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        log.info("Active Spring profiles: {}", Arrays.toString(environment.getActiveProfiles()));
        try {
            URI uri = URI.create(datasourceUrl.substring("jdbc:".length()));
            String database = uri.getPath() == null ? "" : uri.getPath().replaceFirst("^/", "");
            log.info("Resolved datasource: product={} host={} port={} database={}", uri.getScheme(), uri.getHost(), uri.getPort(), database);
        } catch (RuntimeException invalidUrl) {
            // Never log the URL itself: JDBC URLs can contain user information or credentials.
            log.warn("Resolved datasource URL could not be safely summarized; JDBC URL omitted.");
        }
    }
}

