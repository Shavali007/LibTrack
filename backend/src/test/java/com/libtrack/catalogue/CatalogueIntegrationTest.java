package com.libtrack.catalogue;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.libtrack.LibTrackIntegrationTest;
@LibTrackIntegrationTest
class CatalogueIntegrationTest {
 @Autowired MockMvc mvc; private final ObjectMapper mapper=new ObjectMapper();
 @Test void catalogueSearchAndBookDetailsArePublicButInventoryRemainsPrivate()throws Exception{mvc.perform(get("/api/v1/books")).andExpect(status().isOk());mvc.perform(get("/api/v1/categories")).andExpect(status().isOk());String id=createBook(book("Public record "+UUID.randomUUID(),null));mvc.perform(get("/api/v1/books/"+id)).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id));mvc.perform(get("/api/v1/books/"+id+"/copies")).andExpect(status().isUnauthorized());for(String role:new String[]{"STUDENT","FACULTY","LIBRARIAN"}){mvc.perform(get("/api/v1/books").with(user("reader").roles(role))).andExpect(status().isOk());mvc.perform(get("/api/v1/categories").with(user("reader").roles(role))).andExpect(status().isOk());}}
 @Test void librarianCanCreateAndSearchBooksWithDerivedCopyAvailability()throws Exception{String unique=UUID.randomUUID().toString();String id=createBook(book("Catalog "+unique,null));mvc.perform(post("/api/v1/books/"+id+"/copies").with(user("librarian").roles("LIBRARIAN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"copyIdentifier\":\"CC-"+unique.substring(0,8)+"\",\"location\":\"A-2\"}")).andExpect(status().isCreated());mvc.perform(get("/api/v1/books").param("q",unique).with(user("student").roles("STUDENT"))).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].availableCopies").value(1));mvc.perform(get("/api/v1/books").param("title",unique).param("available","true").with(user("faculty").roles("FACULTY"))).andExpect(status().isOk()).andExpect(jsonPath("$.content[0].title").value("Catalog "+unique));}
 @Test void librarianOnlyMutationsAndCsrfAreEnforced()throws Exception{mvc.perform(post("/api/v1/books").with(user("student").roles("STUDENT")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(book("Forbidden",null))).andExpect(status().isForbidden());mvc.perform(post("/api/v1/books").with(user("librarian").roles("LIBRARIAN")).contentType(MediaType.APPLICATION_JSON).content(book("CSRF",null))).andExpect(status().isForbidden());}
 @Test void duplicateIsbnAndInvalidIsbnAreRejected()throws Exception{String body=book("ISBN unique", "9780306406157");createBook(body);mvc.perform(post("/api/v1/books").with(user("librarian").roles("LIBRARIAN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isConflict());mvc.perform(post("/api/v1/books").with(user("librarian").roles("LIBRARIAN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body.replace("9780306406157","ISBN-67"))).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR")).andExpect(jsonPath("$.fieldErrors.isbn").value("ISBN must be a valid ISBN-10 or ISBN-13"));}
 @Test void bookValidationReportsIsbnYearAndCoverUrlFieldsAndAcceptsOptionalCover()throws Exception{
  String isbn=validIsbn13(UUID.randomUUID().toString());
  String body=book("Metadata "+UUID.randomUUID(),isbn).replace("\"circulationPolicy\":\"STANDARD\"","\"circulationPolicy\":\"STANDARD\",\"publicationYear\":2019,\"coverImageUrl\":null");
  mvc.perform(post("/api/v1/books").with(user("librarian").roles("LIBRARIAN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
   .andExpect(status().isCreated()).andExpect(jsonPath("$.isbn").value(isbn)).andExpect(jsonPath("$.publicationYear").value(2019)).andExpect(jsonPath("$.coverImageUrl").value(nullValue()));
  mvc.perform(post("/api/v1/books").with(user("librarian").roles("LIBRARIAN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body.replace("\"publicationYear\":2019","\"publicationYear\":999")))
   .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.publicationYear").value("Publication year must be between 1000 and the current year"));
  mvc.perform(post("/api/v1/books").with(user("librarian").roles("LIBRARIAN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body.replace("\"coverImageUrl\":null","\"coverImageUrl\":\"javascript:alert(1)\"")))
   .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.coverImageUrl").value("Cover image URL must use HTTP or HTTPS"));
  String withCover=body.replace("\"isbn\":\""+isbn+"\"","\"isbn\":\"0306406152\"").replace("\"coverImageUrl\":null","\"coverImageUrl\":\"https://library.example.edu/covers/book.png\"");
  mvc.perform(post("/api/v1/books").with(user("librarian").roles("LIBRARIAN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(withCover))
   .andExpect(status().isCreated()).andExpect(jsonPath("$.isbn").value("0306406152")).andExpect(jsonPath("$.coverImageUrl").value("https://library.example.edu/covers/book.png"));
 }
 @Test void copyIdentifiersAreUniqueAndInventoryIsLibrarianOnly()throws Exception{String unique=UUID.randomUUID().toString().substring(0,8);String id=createBook(book("Copies "+unique,null));String path="/api/v1/books/"+id+"/copies";String payload="{\"copyIdentifier\":\"CC-"+unique+"\"}";mvc.perform(post(path).with(user("librarian").roles("LIBRARIAN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isCreated());mvc.perform(post(path).with(user("librarian").roles("LIBRARIAN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(payload.replace("CC-"+unique,"cc-"+unique))).andExpect(status().isConflict());mvc.perform(get(path).with(user("student").roles("STUDENT"))).andExpect(status().isForbidden());mvc.perform(get(path).with(user("librarian").roles("LIBRARIAN"))).andExpect(status().isOk()).andExpect(jsonPath("$[0].status").value("AVAILABLE"));}
 private String createBook(String body)throws Exception{var result=mvc.perform(post("/api/v1/books").with(user("librarian").roles("LIBRARIAN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated()).andReturn();return mapper.readTree(result.getResponse().getContentAsString()).get("id").asText();}
 private String validIsbn13(String seed){String digits=seed.replaceAll("[^0-9]","");String prefix="978"+(digits+"000000000").substring(0,9);int sum=0;for(int i=0;i<12;i++)sum+=(prefix.charAt(i)-'0')*(i%2==0?1:3);return prefix+((10-sum%10)%10);}
 private String book(String title,String isbn){return "{\"title\":\""+title+"\",\"isbn\":"+(isbn==null?"null":"\""+isbn+"\"")+",\"description\":\"Software craftsmanship\",\"authors\":[\"Author "+title+"\"],\"categories\":[\"Computing\"],\"circulationPolicy\":\"STANDARD\"}";}
 @Test void searchMatchesExactAndPartialIsbnAndReturnsEmptyForUnmatchedQueriesWhilePreservingFilters()throws Exception{
  String unique=UUID.randomUUID().toString();String isbn=validIsbn13(unique);String category="Programming "+unique;
  String body=book("Python "+unique,isbn).replace("Computing",category);
  String id=createBook(body);
  mvc.perform(post("/api/v1/books/"+id+"/copies").with(user("librarian").roles("LIBRARIAN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"copyIdentifier\":\"SEARCH-"+unique.substring(0,8)+"\",\"location\":\"A-1\"}"))
   .andExpect(status().isCreated());
  mvc.perform(get("/api/v1/books").param("q",isbn))
   .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].isbn").value(isbn));
  mvc.perform(get("/api/v1/books").param("q",isbn.substring(0,10)))
   .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].isbn").value(isbn));
  mvc.perform(get("/api/v1/books").param("q","0000000000000"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0)).andExpect(jsonPath("$.content").isEmpty());
  mvc.perform(get("/api/v1/books").param("title","No such title "+unique))
   .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
  mvc.perform(get("/api/v1/books").param("category",category).param("available","true"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].availableCopies").value(1));
  mvc.perform(get("/api/v1/books").param("category",category).param("available","false"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
  mvc.perform(get("/api/v1/books").param("q","").param("category",category).param("available","true"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].id").value(id));
  mvc.perform(get("/api/v1/books"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)));
 }}

