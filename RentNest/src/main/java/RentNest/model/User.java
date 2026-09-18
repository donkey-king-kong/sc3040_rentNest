package RentNest.model;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.util.Collection;
import java.util.Date;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Entity
@Table(name = "users")
public class User implements UserDetails {

    public static final String ROLE_USER = "USER";
    public static final String ROLE_ADMIN = "ADMIN";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long userID;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;
    
    @Column(nullable = false)
    private String password;
    
    @Column
    private String contact;

    @Column
    private String photoURL;

    @Column(nullable = false)
    private int flagged;

    /** The authority ROLE_USER or ROLE_ADMIN is derived from this. New accounts default to USER. */
    @Column(nullable = false)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String role = ROLE_USER;

    /** When the account was created. Set by the server on first save; never accepted from requests. */
    @Column(name = "created_at", updatable = false)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Date createdAt;

    @PrePersist
    void recordCreation() {
        if (createdAt == null) {
            createdAt = new Date();
        }
    }

    //Override Methods from implement

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + (role == null ? ROLE_USER : role)));
    }

    @Override
    public String getUsername() { // use email address as username, unique
        return email;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true; //UserDetails.super.isAccountNonExpired();
    }

    @Override
    public boolean isAccountNonLocked() {
        return true; //UserDetails.super.isAccountNonLocked();
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true; //UserDetails.super.isCredentialsNonExpired();
    }

    @Override
    public boolean isEnabled() {
        return true; //UserDetails.super.isEnabled();
    }



    // Setters
    public User setName(String name) {
        this.name = name;
        return this;
    }

    public User setEmail(String email) {
        this.email = email;
        return this;
    }

    public User setPassword(String password){
        this.password = password;
        return this;
    }

    public User setContact(String contact) {
        this.contact = contact;
        return this;
    }

    public User setPhotoURL(String photoURL) {
        this.photoURL = photoURL;
        return this;
    }

    public User setFlagged(int flagged) {
        this.flagged = flagged;
        return this;
    }

    public User setRole(String role) {
        this.role = role;
        return this;
    }

    public User setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
        return this;
    }


    // Getters
    public Long getUserID() {
        return userID;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    // getPassword is implemented above @Override

    public String getContact() {
        return contact;
    }

    public String getPhotoURL() {
        return photoURL;
    }

    public int getFlagged() {
        return flagged;
    }

    public String getRole() {
        return role;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    @JsonIgnore
    public boolean isAdmin() {
        return ROLE_ADMIN.equalsIgnoreCase(role);
    }


}
