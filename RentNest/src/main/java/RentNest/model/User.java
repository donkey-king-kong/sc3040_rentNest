package RentNest.model;
import jakarta.persistence.*;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Entity
@Table(name = "users")
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
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

    //Override Methods from implement

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(); //Returns empty list as roles are not yet implemented
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


}
