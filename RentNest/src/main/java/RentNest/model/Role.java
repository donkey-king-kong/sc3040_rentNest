package RentNest.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "roles")
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private String roleName;
    
    //Getter
    public int getId() {
        return id;
    }

    public String getRoleName(){
        return roleName;
    }

    //Setter
    private void setId(Integer Id){
        this.id = Id;
    }
    public void setRoleName(String rolename){
        this.roleName = rolename;
    }
    
}
