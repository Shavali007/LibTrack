package com.libtrack.digital;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class ChapterNotFoundException extends RuntimeException {
    public ChapterNotFoundException(String message) {
        super(message);
    }
}
