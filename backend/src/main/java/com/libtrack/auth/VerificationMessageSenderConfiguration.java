package com.libtrack.auth;
import java.time.Clock; import org.springframework.context.annotation.*;
@Configuration
public class VerificationMessageSenderConfiguration{
 @Bean @Profile("test & !development") VerificationMessageSender testVerificationMessageSender(){return message->{};}
 @Bean @Profile("!development & !test") VerificationMessageSender unavailableProductionVerificationMessageSender(){
  return message->{throw new VerificationDeliveryUnavailableException();};
 }
}
