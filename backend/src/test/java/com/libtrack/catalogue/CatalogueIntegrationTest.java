package com.libtrack.catalogue;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class CatalogueIntegrationTest {
 @Autowired MockMvc mvc; private final ObjectMapper mapper=new ObjectMapper();
 @Test void catalogueIsReadableByAllRolesAndAnonymousIsRejected()throws Exception{mvc.perform(get("/api/v1/books")).andExpect(status().isUnauthorized());for(String role:new String[]{"STUDENT","FACULTY","LIBRARIAN"}){mvc.perform(get("/api/v1/books").with(user("reader").roles(role))).andExpect(status().isOk());mvc.perform(get("/api/v1/categories").with(user("reader").roles(role))).andExpect(status().isOk());}}
 @Test void librarianCanCreateAndSearchBooksWithDerivedCopyAvailability()throws Exception{String unique=UUID.randomUUID().toString();String id=createBook(book("Catalog "+unique,null));mvc.perform(post("/api/v1/books/"+id+"/copies").with(user("librarian").roles("LIBRARIAN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"copyIdentifier\":\"CC-"+unique.substring(0,8)+"\",\"location\":\"A-2\"}")).andExpect(status().isCreated());mvc.perform(get("/api/v1/books").param("q",unique).with(user("student").roles("STUDENT"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].availableCopies").value(1));mvc.perform(get("/api/v1/books").param("title",unique).param("available","true").with(user("faculty").roles("FACULTY"))).andExpect(status().isOk()).andExpect(jsonPath("$.content[0].title").value("Catalog "+unique));}
 @Test void librarianOnlyMutationsAndCsrfAreEnforced()throws Exception{mvc.perform(post("/api/v1/books").with(user("student").roles("STUDENT")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(book("Forbidden",null))).andExpect(status().isForbidden());mvc.perform(post("/api/v1/books").with(user("librarian").roles("LIBRARIAN")).contentType(MediaType.APPLICATION_JSON).content(book("CSRF",null))).andExpect(status().isForbidden());}
 @Test void duplicateIsbnAndInvalidIsbnAreRejected()throws Exception{String body=book("ISBN unique", "9780306406157");createBook(body);mvc.perform(post("/api/v1/books").with(user("librarian").roles("LIBRARIAN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isConflict());mvc.perform(post("/api/v1/books").with(user("librarian").roles("LIBRARIAN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body.replace("9780306406157","9780306406158"))).andExpect(status().isBadRequest());}
 @Test void copyIdentifiersAreUniqueAndInventoryIsLibrarianOnly()throws Exception{String unique=UUID.randomUUID().toString().substring(0,8);String id=createBook(book("Copies "+unique,null));String path="/api/v1/books/"+id+"/copies";String payload="{\"copyIdentifier\":\"CC-"+unique+"\"}";mvc.perform(post(path).with(user("librarian").roles("LIBRARIAN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isCreated());mvc.perform(post(path).with(user("librarian").roles("LIBRARIAN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(payload.replace("CC-"+unique,"cc-"+unique))).andExpect(status().isConflict());mvc.perform(get(path).with(user("student").roles("STUDENT"))).andExpect(status().isForbidden());mvc.perform(get(path).with(user("librarian").roles("LIBRARIAN"))).andExpect(status().isOk()).andExpect(jsonPath("$[0].status").value("AVAILABLE"));}
 private String createBook(String body)throws Exception{var result=mvc.perform(post("/api/v1/books").with(user("librarian").roles("LIBRARIAN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated()).andReturn();return mapper.readTree(result.getResponse().getContentAsString()).get("id").asText();}
 private String book(String title,String isbn){return "{\"title\":\""+title+"\",\"isbn\":"+(isbn==null?"null":"\""+isbn+"\"")+",\"description\":\"Software craftsmanship\",\"authors\":[\"Author "+title+"\"],\"categories\":[\"Computing\"],\"circulationPolicy\":\"STANDARD\"}";}
}

