package com.libtrack.circulation;
import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
@Configuration
public class LibraryTimeConfiguration {
 @Bean Clock libraryClock(@Value("${libtrack.library-zone:UTC}") String zone){return Clock.system(ZoneId.of(zone));}
}
