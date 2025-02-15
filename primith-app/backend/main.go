package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/ai/azopenai"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/container"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/sas"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
	"github.com/rs/cors"
	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
	"golang.org/x/crypto/bcrypt"
)

// Session stores user session information
type Session struct {
	UserID    string
	CreatedAt time.Time
	ExpiresAt time.Time
}

// In-memory session store (replace with database in production)
var sessions = map[string]Session{}

type RefreshToken struct {
	Token     string
	UserID    string
	ExpiresAt time.Time
}

var refreshTokens = make(map[string]RefreshToken)

type ContactRequest struct {
	FirstName    string `json:"firstName"`
	LastName     string `json:"lastName"`
	Email        string `json:"email"`
	Phone        string `json:"phone"`
	Company      string `json:"company"`
	Message      string `json:"message"`
	CaptchaToken string `json:"captchaToken"`
}

type UserData struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Email     string `json:"email"`
}

type LoginResponse struct {
	Success      bool     `json:"success"`
	Message      string   `json:"message"`
	Token        string   `json:"token,omitempty"`
	RefreshToken string   `json:"refreshToken,omitempty"`
	User         UserData `json:"user,omitempty"`
}

type contextKey string

const claimsKey contextKey = "userClaims"

type Response struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// Keep AuthResponse with regular string
type AuthResponse struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	Token        string `json:"token,omitempty"`
	RefreshToken string `json:"refreshToken,omitempty"`
}

type Config struct {
	Environment string `json:"ENVIRONMENT"`
	SendGrid    struct {
		APIKey string `json:"SENDGRID_API_KEY"`
	} `json:"sendgrid"`
	Clerk struct {
		DevKey  string `json:"CLERK_SECRET_KEY_DEV"`
		ProdKey string `json:"CLERK_SECRET_KEY"`
	} `json:"clerk"`
	Database struct {
		User     string `json:"DB_USER"`
		Password string `json:"DB_PASSWORD"`
		DBName   string `json:"DB_NAME"`
		Host     string `json:"DB_HOST"`
		SSLMode  string `json:"DB_SSLMODE"`
	} `json:"database"`
	OpenAI struct {
		APIKey string `json:"OPENAI_API_KEY"`
	} `json:"openai"`
	Azure struct {
		OpenAIKey      string `json:"AZURE_OPENAI_API_KEY"`
		DeploymentID   string `json:"AZURE_OPENAI_DEPLOYMENT_ID"`
		Endpoint       string `json:"AZURE_OPENAI_ENDPOINT"`
		SearchIndex    string `json:"AZURE_AI_SEARCH_INDEX"`
		SearchEndpoint string `json:"AZURE_AI_SEARCH_ENDPOINT"`
		SearchAPIKey   string `json:"AZURE_AI_SEARCH_API_KEY"`
		StorageAccount string `json:"AZURE_STORAGE_ACCOUNT_NAME"`
		StorageKey     string `json:"AZURE_STORAGE_ACCOUNT_KEY"`
	} `json:"azure"`
}

// User represents a user in the system
type User struct {
	ID        string `json:"id"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Username  string `json:"username"`
	Password  string `json:"password"`
	Email     string `json:"email"`
}

type AdminUser struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	FirstName string    `json:"firstName"`
	LastName  string    `json:"lastName"`
	IsActive  bool      `json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Organization struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Role struct {
	ID             string    `json:"id"`
	OrganizationID *string   `json:"organizationId"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	CreatedAt      time.Time `json:"createdAt"`
}

type Service struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type ChatRequest struct {
	Message string `json:"message"`
}

type CodeBlock struct {
	Language string `json:"language"`
	Content  string `json:"content"`
}

type ChatResponse struct {
	Response string     `json:"response"`
	Code     *CodeBlock `json:"code,omitempty"`
	Table    *TableData `json:"table,omitempty"`
}

type TableData struct {
	Headers []string   `json:"headers"`
	Rows    [][]string `json:"rows"`
}

type Folder struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	ProjectID      string    `json:"projectId"`
	ParentID       *string   `json:"parentId"`
	OrganizationID string    `json:"organizationId"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type CreateFolderRequest struct {
	ProjectID string  `json:"projectId"`
	Name      string  `json:"name"`
	ParentID  *string `json:"parentId"`
}

// JWT related constants
const JWT_EXPIRY = 24 * time.Hour

var JWT_SECRET_KEY = os.Getenv("JWT_SECRET")

// Claims represents the JWT claims
type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// In-memory user store (replace with database in production)
var db *sql.DB

type nopReadSeekCloser struct {
	io.ReadSeeker
}

func (n nopReadSeekCloser) Close() error {
	return nil
}

// Initialize the application
func init() {
	env := os.Getenv("ENVIRONMENT")
	if env == "production" {
		// Use environment variables for production
		clerk.SetKey(os.Getenv("CLERK_SECRET_KEY"))
	} else {
		// Load config for development
		config, err := loadConfigIfDev()
		if err != nil {
			log.Printf("Failed to load config for development mode: %v", err)
		} else {
			clerk.SetKey(config.Clerk.DevKey)
		}
	}

	// Start session cleanup goroutine
	go cleanupSessions()

	log.Println("Initialization complete")
}

func initDB(config Config) error {
	var err error
	var connStr string

	if os.Getenv("ENVIRONMENT") == "production" {
		// Use environment variables in production
		connStr = fmt.Sprintf("user=%s dbname=%s password=%s host=%s sslmode=%s",
			os.Getenv("DB_USER"),
			os.Getenv("DB_NAME"),
			os.Getenv("DB_PASSWORD"),
			os.Getenv("DB_HOST"),
			os.Getenv("DB_SSLMODE"))
	} else {
		// Use config file in development
		connStr = fmt.Sprintf("user=%s dbname=%s password=%s host=%s sslmode=%s",
			config.Database.User,
			config.Database.DBName,
			config.Database.Password,
			config.Database.Host,
			config.Database.SSLMode)
	}

	log.Printf("Attempting to connect with connection string")

	db, err = sql.Open("postgres", connStr)
	if err != nil {
		return err
	}
	return db.Ping()
}

// LoadConfigIfDev checks if we're in development mode before loading the config
func loadConfigIfDev() (Config, error) {
	var config Config

	file, err := os.Open("config.json")
	if err != nil {
		log.Printf("Error opening config.json: %v", err)
		return config, err
	}
	defer file.Close()

	err = json.NewDecoder(file).Decode(&config)
	if err != nil {
		log.Printf("Error decoding config.json: %v", err)
		return config, err
	}

	return config, nil
}

// Periodically cleanup expired sessions
func cleanupSessions() {
	for {
		time.Sleep(1 * time.Hour)
		now := time.Now()
		for id, session := range sessions {
			if now.After(session.ExpiresAt) {
				delete(sessions, id)
				log.Printf("Cleaned up expired session: %s", id)
			}
		}
	}
}

func sendEmail(request ContactRequest) error {
	apiKey := os.Getenv("SENDGRID_API_KEY")
	if apiKey == "" {
		config, err := loadConfigIfDev()
		if err != nil {
			return err
		}
		apiKey = config.SendGrid.APIKey
	}

	from := mail.NewEmail("Primith Contact Form", "michael.forbes@primith.com")
	to := mail.NewEmail("Michael Forbes", "michael.forbes@primith.com")
	subject := "New Contact Form Submission"
	plainTextContent := fmt.Sprintf(`
Name: %s %s
Email: %s
Phone: %s
Company: %s

Message:
%s`, request.FirstName, request.LastName, request.Email, request.Phone, request.Company, request.Message)

	htmlContent := fmt.Sprintf(`
<p><strong>Name:</strong> %s %s</p>
<p><strong>Email:</strong> %s</p>
<p><strong>Phone:</strong> %s</p>
<p><strong>Company:</strong> %s</p>
<p><strong>Message:</strong><br>%s</p>`,
		request.FirstName, request.LastName, request.Email, request.Phone, request.Company, request.Message)

	message := mail.NewSingleEmail(from, subject, to, plainTextContent, htmlContent)
	client := sendgrid.NewSendClient(apiKey)

	response, err := client.Send(message)
	if err != nil {
		return err
	}

	if response.StatusCode >= 400 {
		return fmt.Errorf("failed to send email: %v", response.Body)
	}

	return nil
}

func handleContact(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req ContactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(Response{Success: false, Message: "Invalid request format"})
		return
	}

	if err := sendEmail(req); err != nil {
		log.Printf("Email sending error: %v", err)
		json.NewEncoder(w).Encode(Response{Success: false, Message: "Failed to send email"})
		return
	}

	json.NewEncoder(w).Encode(Response{Success: true, Message: "Message sent successfully"})
}

func validateToken(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(JWT_SECRET_KEY), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}

func login(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Get IP address and user agent
	ipAddress := r.Header.Get("X-Real-IP")
	if ipAddress == "" {
		ipAddress = r.RemoteAddr
	}
	userAgent := r.Header.Get("User-Agent")

	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		// Record failed attempt
		var auditID string
		if _, dbErr := db.Exec(`CALL auth.record_login_attempt($1, $2, $3, $4, $5, $6, $7)`,
			nil, user.Username, ipAddress, userAgent, "failed", "Invalid request format", &auditID); dbErr != nil {
			log.Printf("Failed to record login attempt: %v", dbErr)
		}
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(LoginResponse{
			Success: false,
			Message: "Invalid request format",
		})
		return
	}

	// Query the database for the user
	var storedHash string
	var userData UserData
	var userID string
	err := db.QueryRow(`
		SELECT id, password_hash, first_name, last_name, email 
		FROM auth.users WHERE email = $1`,
		user.Username).Scan(&userID, &storedHash, &userData.FirstName, &userData.LastName, &userData.Email)

	if err == sql.ErrNoRows {
		// Record failed attempt for non-existent user
		var auditID string
		if _, dbErr := db.Exec(`CALL auth.record_login_attempt($1, $2, $3, $4, $5, $6, $7)`,
			nil, user.Username, ipAddress, userAgent, "failed", "User not found", &auditID); dbErr != nil {
			log.Printf("Failed to record login attempt: %v", dbErr)
		}
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(LoginResponse{
			Success: false,
			Message: "Invalid email or password",
		})
		return
	} else if err != nil {
		log.Printf("Database error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(LoginResponse{
			Success: false,
			Message: "Internal server error",
		})
		return
	}

	// Compare the password
	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(user.Password)); err != nil {
		var auditID string
		if _, dbErr := db.Exec(`CALL auth.record_login_attempt($1, $2, $3, $4, $5, $6, $7)`,
			userID, user.Username, ipAddress, userAgent, "failed", "Invalid password", &auditID); dbErr != nil {
			log.Printf("Failed to record login attempt: %v", dbErr)
		}
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(LoginResponse{
			Success: false,
			Message: "Invalid email or password",
		})
		return
	}

	// Generate access token
	accessClaims := &Claims{
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(JWT_SECRET_KEY))
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(LoginResponse{
			Success: false,
			Message: "Failed to generate access token",
		})
		return
	}

	// Generate refresh token
	refreshClaims := &Claims{
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString([]byte(JWT_SECRET_KEY))
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(LoginResponse{
			Success: false,
			Message: "Failed to generate refresh token",
		})
		return
	}

	// Record successful login
	if _, dbErr := db.Exec(`CALL auth.record_login_attempt($1, $2, $3, $4, $5, $6)`,
		userID, user.Username, ipAddress, userAgent, "success", nil); dbErr != nil {
		log.Printf("Failed to record successful login attempt for user %s: %v", user.Username, dbErr)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(LoginResponse{
		Success:      true,
		Message:      "Logged in successfully",
		Token:        accessTokenString,
		RefreshToken: refreshTokenString,
		User:         userData,
	})
}

func protected(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	claims := r.Context().Value(claimsKey).(*Claims)

	json.NewEncoder(w).Encode(Response{
		Success: true,
		Message: fmt.Sprintf("Hello, %s! This is a protected route.", claims.Username),
	})
}

func isSuperAdmin(email string) (bool, error) {
	var isSuperAdmin bool
	err := db.QueryRow(`
        SELECT EXISTS(
            SELECT 1 FROM auth.user_roles ur
            JOIN auth.roles r ON ur.role_id = r.id
            JOIN auth.users u ON ur.user_id = u.id
            WHERE u.email = $1 
            AND r.name = 'super_admin'
        )`, email).Scan(&isSuperAdmin)
	return isSuperAdmin, err
}

func superAdminMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value(claimsKey).(*Claims)

		isSuperAdmin, err := isSuperAdmin(claims.Username)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(Response{
				Success: false,
				Message: "Error checking admin status",
			})
			return
		}

		if !isSuperAdmin {
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(Response{
				Success: false,
				Message: "Super admin access required",
			})
			return
		}

		next(w, r)
	})
}

// User Handlers
func handleListUsers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := db.Query(`
		SELECT 
			u.id, 
			u.email, 
			u.first_name, 
			u.last_name, 
			u.is_active, 
			u.created_at, 
			u.updated_at,
			COALESCE((SELECT json_agg(row_to_json(o))
					FROM (
						SELECT o.id, o.name, o.description
						FROM auth.organizations o
						INNER JOIN auth.organization_members om ON o.id = om.organization_id
						WHERE om.user_id = u.id
					) o), '[]') AS organizations,
			COALESCE((SELECT json_agg(row_to_json(r))
					FROM (
						SELECT r.id, r.name, r.description, r.organization_id
						FROM auth.roles r
						INNER JOIN auth.user_roles ur ON r.id = ur.role_id
						WHERE ur.user_id = u.id
					) r), '[]') AS roles
		FROM auth.users u
		ORDER BY u.created_at DESC
    `)
	if err != nil {
		log.Printf("Error querying users: %v", err)
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []map[string]interface{}
	for rows.Next() {
		var user struct {
			ID            string
			Email         string
			FirstName     string
			LastName      string
			IsActive      bool
			CreatedAt     time.Time
			UpdatedAt     time.Time
			Organizations *string
			Roles         *string
		}

		if err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.FirstName,
			&user.LastName,
			&user.IsActive,
			&user.CreatedAt,
			&user.UpdatedAt,
			&user.Organizations,
			&user.Roles,
		); err != nil {
			log.Printf("Error scanning user row: %v", err)
			http.Error(w, "Error scanning users", http.StatusInternalServerError)
			return
		}

		var organizations []map[string]interface{}
		var roles []map[string]interface{}

		if user.Organizations != nil && *user.Organizations != "[null]" {
			if err := json.Unmarshal([]byte(*user.Organizations), &organizations); err != nil {
				log.Printf("Error parsing organizations: %v", err)
				http.Error(w, "Error parsing organizations", http.StatusInternalServerError)
				return
			}
		}

		if user.Roles != nil && *user.Roles != "[null]" {
			if err := json.Unmarshal([]byte(*user.Roles), &roles); err != nil {
				log.Printf("Error parsing roles: %v", err)
				http.Error(w, "Error parsing roles", http.StatusInternalServerError)
				return
			}
		}

		userMap := map[string]interface{}{
			"id":            user.ID,
			"email":         user.Email,
			"firstName":     user.FirstName,
			"lastName":      user.LastName,
			"isActive":      user.IsActive,
			"createdAt":     user.CreatedAt,
			"updatedAt":     user.UpdatedAt,
			"organizations": organizations,
			"roles":         roles,
		}

		users = append(users, userMap)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"users": users,
	})
}

func handleUpdateUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := vars["id"]

	var updateData AdminUser
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	_, err := db.Exec(`
        CALL auth.update_user($1, $2, $3, $4, $5)
    `, userID, updateData.Email, updateData.FirstName, updateData.LastName, updateData.IsActive)

	if err != nil {
		http.Error(w, "Failed to update user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(Response{Success: true, Message: "User updated successfully"})
}

func handleDeleteUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := vars["id"]

	_, err := db.Exec(`CALL auth.delete_user($1)`, userID)
	if err != nil {
		http.Error(w, "Failed to delete user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(Response{Success: true, Message: "User deleted successfully"})
}

// Organization Handlers
func handleListOrganizations(w http.ResponseWriter, r *http.Request) {
	var orgs []Organization
	rows, err := db.Query(`
        SELECT id, name, description, created_at, updated_at 
        FROM auth.organizations ORDER BY created_at DESC
    `)
	if err != nil {
		http.Error(w, "Failed to fetch organizations", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var org Organization
		err := rows.Scan(&org.ID, &org.Name, &org.Description, &org.CreatedAt, &org.UpdatedAt)
		if err != nil {
			http.Error(w, "Error scanning organizations", http.StatusInternalServerError)
			return
		}
		orgs = append(orgs, org)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"organizations": orgs,
	})
}

func handleCreateOrganization(w http.ResponseWriter, r *http.Request) {
	var org Organization
	if err := json.NewDecoder(r.Body).Decode(&org); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var orgID string
	err := db.QueryRow(`
        CALL auth.create_organization($1, $2, $3)
    `, org.Name, org.Description, &orgID).Scan(&orgID)

	if err != nil {
		http.Error(w, "Failed to create organization", http.StatusInternalServerError)
		return
	}

	org.ID = orgID
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":      true,
		"message":      "Organization created successfully",
		"organization": org,
	})
}

func handleUpdateOrganization(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	orgID := vars["id"]

	var updateData Organization
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	_, err := db.Exec(`
        CALL auth.update_organization($1, $2, $3)
    `, orgID, updateData.Name, updateData.Description)

	if err != nil {
		http.Error(w, "Failed to update organization", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(Response{Success: true, Message: "Organization updated successfully"})
}

func handleDeleteOrganization(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	orgID := vars["id"]

	_, err := db.Exec(`CALL auth.delete_organization($1)`, orgID)
	if err != nil {
		http.Error(w, "Failed to delete organization", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(Response{Success: true, Message: "Organization deleted successfully"})
}

// Role Handlers
func handleListRoles(w http.ResponseWriter, r *http.Request) {
	var roles []Role
	rows, err := db.Query(`
        SELECT id, organization_id, name, description, created_at 
        FROM auth.roles ORDER BY created_at DESC
    `)
	if err != nil {
		http.Error(w, "Failed to fetch roles", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var role Role
		err := rows.Scan(&role.ID, &role.OrganizationID, &role.Name, &role.Description, &role.CreatedAt)
		if err != nil {
			http.Error(w, "Error scanning roles", http.StatusInternalServerError)
			return
		}
		roles = append(roles, role)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"roles": roles,
	})
}

func handleCreateRole(w http.ResponseWriter, r *http.Request) {
	var role Role
	if err := json.NewDecoder(r.Body).Decode(&role); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var roleID string
	err := db.QueryRow(`
        CALL auth.create_role($1, $2, $3, $4)
    `, role.OrganizationID, role.Name, role.Description, &roleID).Scan(&roleID)

	if err != nil {
		http.Error(w, "Failed to create role", http.StatusInternalServerError)
		return
	}

	role.ID = roleID
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Role created successfully",
		"role":    role,
	})
}

func handleUpdateRole(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	roleID := vars["id"]
	log.Printf("Attempting to update role with ID: %s\n", roleID)

	// Decode the request body
	var updateData Role
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		log.Printf("Error decoding request body: %v\n", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Printf("Update data received: %+v\n", updateData)

	// Update the role
	result, err := db.Exec(`
        CALL auth.update_role($1, $2, $3, $4)
    `, roleID, updateData.Name, updateData.Description, updateData.OrganizationID)

	if err != nil {
		log.Printf("Error updating role in database: %v\n", err)
		http.Error(w, "Failed to update role", http.StatusInternalServerError)
		return
	}

	// Log the result of the update operation
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v\n", err)
	} else {
		log.Printf("Rows affected by update: %d\n", rowsAffected)
	}

	// Fetch the updated role from the database
	var updatedRole Role
	err = db.QueryRow(`
        SELECT id, organization_id, name, description, created_at
        FROM auth.roles
        WHERE id = $1
    `, roleID).Scan(&updatedRole.ID, &updatedRole.OrganizationID, &updatedRole.Name, &updatedRole.Description, &updatedRole.CreatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("No role found with ID: %s\n", roleID)
		} else {
			log.Printf("Error fetching updated role: %v\n", err)
		}
		http.Error(w, "Failed to fetch updated role", http.StatusInternalServerError)
		return
	}
	log.Printf("Updated role fetched: %+v\n", updatedRole)

	// Return the updated role in the response
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(updatedRole); err != nil {
		log.Printf("Error encoding response: %v\n", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

func handleDeleteRole(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	roleID := vars["id"]

	_, err := db.Exec(`CALL auth.delete_role($1)`, roleID)
	if err != nil {
		http.Error(w, "Failed to delete role", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(Response{Success: true, Message: "Role deleted successfully"})
}

// Service Handlers
func handleListServices(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := db.Query(`
        SELECT s.id, s.name, s.description, s.status, s.created_at, s.updated_at,
               array_agg(json_build_object(
                   'id', o.id,
                   'name', o.name,
                   'description', o.description
               )) as organizations
        FROM services.services s
        LEFT JOIN services.organization_services os ON s.id = os.service_id
        LEFT JOIN auth.organizations o ON os.organization_id = o.id
        GROUP BY s.id, s.name, s.description, s.status, s.created_at, s.updated_at
    `)

	if err != nil {
		http.Error(w, "Failed to fetch services", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var services []map[string]interface{}
	for rows.Next() {
		var service struct {
			ID            string
			Name          string
			Description   sql.NullString
			Status        sql.NullString
			CreatedAt     time.Time
			UpdatedAt     time.Time
			Organizations string
		}

		if err := rows.Scan(
			&service.ID,
			&service.Name,
			&service.Description,
			&service.Status,
			&service.CreatedAt,
			&service.UpdatedAt,
			&service.Organizations,
		); err != nil {
			http.Error(w, "Error scanning services", http.StatusInternalServerError)
			return
		}

		var orgs []map[string]interface{}
		if service.Organizations != "[null]" {
			if err := json.Unmarshal([]byte(service.Organizations), &orgs); err != nil {
				http.Error(w, "Error parsing organizations", http.StatusInternalServerError)
				return
			}
		}

		serviceMap := map[string]interface{}{
			"id":            service.ID,
			"name":          service.Name,
			"description":   service.Description.String,
			"status":        service.Status.String,
			"createdAt":     service.CreatedAt,
			"updatedAt":     service.UpdatedAt,
			"organizations": orgs,
		}

		services = append(services, serviceMap)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"services": services,
	})
}

func handleCreateService(w http.ResponseWriter, r *http.Request) {
	var service Service
	if err := json.NewDecoder(r.Body).Decode(&service); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var serviceID string
	err := db.QueryRow(`
        CALL services.create_service($1, $2, $3)
    `, service.Name, service.Description, &serviceID).Scan(&serviceID)

	if err != nil {
		http.Error(w, "Failed to create service", http.StatusInternalServerError)
		return
	}

	service.ID = serviceID
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Service created successfully",
		"service": service,
	})
}

func handleUpdateService(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	serviceID := vars["id"]

	var updateData Service
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	_, err := db.Exec(`
        CALL services.update_service($1, $2, $3)
    `, serviceID, updateData.Name, updateData.Description)

	if err != nil {
		http.Error(w, "Failed to update service", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(Response{Success: true, Message: "Service updated successfully"})
}

func handleDeleteService(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	serviceID := vars["id"]

	_, err := db.Exec(`CALL services.delete_service($1)`, serviceID)
	if err != nil {
		http.Error(w, "Failed to delete service", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(Response{Success: true, Message: "Service deleted successfully"})
}

// Get current user's profile
func handleGetCurrentUser(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	claims := r.Context().Value(claimsKey).(*Claims)

	var user AdminUser
	err := db.QueryRow(`
        SELECT id, email, first_name, last_name, is_active, created_at, updated_at 
        FROM auth.users WHERE email = $1
    `, claims.Username).Scan(
		&user.ID, &user.Email, &user.FirstName, &user.LastName,
		&user.IsActive, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to fetch user profile", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(user)
}

// Check if user is super admin
func handleAdminCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	claims := r.Context().Value(claimsKey).(*Claims)

	var isSuperAdmin bool
	err := db.QueryRow(`
        SELECT EXISTS(
            SELECT 1 FROM auth.user_roles ur
            JOIN auth.roles r ON ur.role_id = r.id
            JOIN auth.users u ON ur.user_id = u.id
            WHERE u.email = $1 
            AND r.name = 'super_admin'
        )
    `, claims.Username).Scan(&isSuperAdmin)

	if err != nil {
		http.Error(w, "Error checking admin status", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]bool{"success": isSuperAdmin})
}

// Create new user
func handleCreateUser(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	var userID string
	err = db.QueryRow(`
        CALL auth.create_user($1, $2, $3, $4, $5)
    `, user.Email, string(hashedPassword), user.FirstName, user.LastName, &userID).Scan(&userID)

	if err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	user.ID = userID
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "User created successfully",
		"user":    user,
	})
}

// Get single user by ID
func handleGetUser(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	userID := vars["id"]

	var user AdminUser
	err := db.QueryRow(`
        SELECT id, email, first_name, last_name, is_active, created_at, updated_at 
        FROM auth.users WHERE id = $1
    `, userID).Scan(
		&user.ID, &user.Email, &user.FirstName, &user.LastName,
		&user.IsActive, &user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Failed to fetch user", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(user)
}

// Get single organization by ID
func handleGetOrganization(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	orgID := vars["id"]

	var org Organization
	err := db.QueryRow(`
        SELECT id, name, description, created_at, updated_at 
        FROM auth.organizations WHERE id = $1
    `, orgID).Scan(
		&org.ID, &org.Name, &org.Description, &org.CreatedAt, &org.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Organization not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Failed to fetch organization", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(org)
}

// Get single role by ID
func handleGetRole(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	roleID := vars["id"]

	var role Role
	err := db.QueryRow(`
        SELECT id, organization_id, name, description, created_at
        FROM auth.roles WHERE id = $1
    `, roleID).Scan(
		&role.ID, &role.OrganizationID, &role.Name, &role.Description, &role.CreatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Role not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Failed to fetch role", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(role)
}

// Get single service by ID
func handleGetService(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	serviceID := vars["id"]

	var service Service
	err := db.QueryRow(`
        SELECT id, name, description, status, created_at, updated_at 
        FROM services.services WHERE id = $1
    `, serviceID).Scan(
		&service.ID, &service.Name, &service.Description, &service.Status,
		&service.CreatedAt, &service.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Failed to fetch service", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(service)
}

func handleAssignOrganizationToService(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	serviceId := vars["serviceId"]

	var request struct {
		OrganizationID string `json:"organizationId"`
		Status         string `json:"status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	_, err := db.Exec(`
        CALL services.assign_organization_service($1, $2, $3)
    `, request.OrganizationID, serviceId, request.Status)

	if err != nil {
		log.Printf("Failed to assign organization to service: %v", err)
		http.Error(w, "Failed to assign organization to service", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(Response{
		Success: true,
		Message: "Organization assigned to service successfully",
	})
}

func handleRemoveOrganizationFromService(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	serviceId := vars["serviceId"]
	orgId := vars["orgId"]

	_, err := db.Exec(`
        CALL services.remove_organization_service($1, $2)
    `, orgId, serviceId)

	if err != nil {
		log.Printf("Failed to remove organization from service: %v", err)
		http.Error(w, "Failed to remove organization from service", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(Response{
		Success: true,
		Message: "Organization removed from service successfully",
	})
}

func register(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Check if user already exists
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = $1)", user.Username).Scan(&exists)
	if err != nil {
		log.Printf("Database error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if exists {
		http.Error(w, "Email already exists", http.StatusConflict)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	// Insert new user
	_, err = db.Exec("INSERT INTO auth.users (email, password_hash) VALUES ($1, $2)",
		user.Username, string(hashedPassword))
	if err != nil {
		log.Printf("Database error: %v", err)
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(Response{Success: true, Message: "User registered successfully"})
}

func logout(w http.ResponseWriter, r *http.Request) {
	refreshToken := r.Header.Get("X-Refresh-Token")
	if refreshToken != "" {
		delete(refreshTokens, refreshToken)
	}

	json.NewEncoder(w).Encode(Response{
		Success: true,
		Message: "Logged out successfully",
	})
}

func refreshAccessToken(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	refreshTokenString := r.Header.Get("X-Refresh-Token")
	if refreshTokenString == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(AuthResponse{
			Success: false,
			Message: "No refresh token provided",
		})
		return
	}

	claims, err := validateToken(refreshTokenString)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(AuthResponse{
			Success: false,
			Message: "Invalid refresh token",
		})
		return
	}

	// Generate new access token
	accessClaims := &Claims{
		Username: claims.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	// Generate new refresh token
	refreshClaims := &Claims{
		Username: claims.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(JWT_SECRET_KEY))
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(AuthResponse{
			Success: false,
			Message: "Failed to generate new access token",
		})
		return
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err = refreshToken.SignedString([]byte(JWT_SECRET_KEY))
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(AuthResponse{
			Success: false,
			Message: "Failed to generate new refresh token",
		})
		return
	}

	json.NewEncoder(w).Encode(AuthResponse{
		Success:      true,
		Message:      "Tokens refreshed successfully",
		Token:        accessTokenString,
		RefreshToken: refreshTokenString,
	})
}

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		// Get token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(Response{
				Success: false,
				Message: "No token provided",
			})
			return
		}

		// Remove "Bearer " prefix
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// Validate token
		claims, err := validateToken(tokenString)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(Response{
				Success: false,
				Message: "Invalid token",
			})
			return
		}

		// Add claims to request context
		ctx := context.WithValue(r.Context(), claimsKey, claims)
		next(w, r.WithContext(ctx))
	}
}

func removeDocReferences(text string) string {
	// Remove [doc1], [doc2] etc. patterns and any space before a period
	re := regexp.MustCompile(`\s*\[doc\d+\]\s*\.`)
	return re.ReplaceAllString(text, ".")
}

func handleChat(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get Azure configurations
	var azureOpenAIKey, modelDeploymentID, azureOpenAIEndpoint string
	var searchIndex, searchEndpoint, searchAPIKey string

	if os.Getenv("ENVIRONMENT") == "production" {
		azureOpenAIKey = os.Getenv("AZURE_OPENAI_API_KEY")
		modelDeploymentID = os.Getenv("AZURE_OPENAI_DEPLOYMENT_ID")
		azureOpenAIEndpoint = os.Getenv("AZURE_OPENAI_ENDPOINT")
		searchIndex = os.Getenv("AZURE_AI_SEARCH_INDEX")
		searchEndpoint = os.Getenv("AZURE_AI_SEARCH_ENDPOINT")
		searchAPIKey = os.Getenv("AZURE_AI_SEARCH_API_KEY")
	} else {
		config, err := loadConfigIfDev()
		if err != nil {
			log.Printf("Failed to load config: %v", err)
			http.Error(w, "Server configuration error", http.StatusInternalServerError)
			return
		}
		azureOpenAIKey = config.Azure.OpenAIKey
		modelDeploymentID = config.Azure.DeploymentID
		azureOpenAIEndpoint = config.Azure.Endpoint
		searchIndex = config.Azure.SearchIndex
		searchEndpoint = config.Azure.SearchEndpoint
		searchAPIKey = config.Azure.SearchAPIKey
	}

	if azureOpenAIKey == "" || modelDeploymentID == "" || azureOpenAIEndpoint == "" ||
		searchIndex == "" || searchEndpoint == "" || searchAPIKey == "" {
		log.Printf("Missing Azure configuration")
		http.Error(w, "Server configuration error", http.StatusInternalServerError)
		return
	}

	keyCredential := azcore.NewKeyCredential(azureOpenAIKey)
	client, err := azopenai.NewClientWithKeyCredential(azureOpenAIEndpoint, keyCredential, nil)
	if err != nil {
		log.Printf("Error creating Azure OpenAI client: %v", err)
		http.Error(w, "Failed to initialize chat service", http.StatusInternalServerError)
		return
	}

	systemPrompt := "You are an expert consultant and with expert coding abilities. If response requires code, provide brief explanations and concise code in markdown blocks with language tags and essential comments only. Do not include references to the source document in your responses (doc1)."

	messages := []azopenai.ChatRequestMessageClassification{
		&azopenai.ChatRequestSystemMessage{
			Content: azopenai.NewChatRequestSystemMessageContent(systemPrompt),
		},
		&azopenai.ChatRequestUserMessage{
			Content: azopenai.NewChatRequestUserMessageContent(req.Message),
		},
	}

	resp, err := client.GetChatCompletions(context.TODO(), azopenai.ChatCompletionsOptions{
		Messages:    messages,
		MaxTokens:   to.Ptr[int32](800),
		Temperature: to.Ptr[float32](0.7),
		TopP:        to.Ptr[float32](0.95),
		AzureExtensionsOptions: []azopenai.AzureChatExtensionConfigurationClassification{
			&azopenai.AzureSearchChatExtensionConfiguration{
				Parameters: &azopenai.AzureSearchChatExtensionParameters{
					Endpoint:  &searchEndpoint,
					IndexName: &searchIndex,
					Authentication: &azopenai.OnYourDataAPIKeyAuthenticationOptions{
						Key: &searchAPIKey,
					},
					InScope: to.Ptr(true),
				},
			},
		},
		DeploymentName: &modelDeploymentID,
	}, nil)

	if err != nil {
		log.Printf("Error from Azure OpenAI Chat API: %v", err)
		http.Error(w, "Failed to process request", http.StatusInternalServerError)
		return
	}

	response := *resp.Choices[0].Message.Content
	response = removeDocReferences(response)
	chatResponse := ChatResponse{
		Response: response,
	}

	// Keep existing code block and table parsing logic
	if code := extractCodeBlock(response); code != nil {
		chatResponse.Code = code
		chatResponse.Response = cleanResponseText(response)
	}

	if table := parseMarkdownTable(response); table != nil {
		chatResponse.Table = table
		chatResponse.Response = cleanTableText(response)
	}

	json.NewEncoder(w).Encode(chatResponse)
}

func cleanTableText(content string) string {
	// Remove markdown table from the response
	tableRegex := regexp.MustCompile(`\|([^\n]+)\|\n\|([-|\s]+)\|\n((?:\|[^\n]+\|\n?)*)`)
	cleaned := tableRegex.ReplaceAllString(content, "")
	return strings.TrimSpace(cleaned)
}

func extractCodeBlock(content string) *CodeBlock {
	// Look for markdown code blocks
	codeBlockRegex := regexp.MustCompile("```([a-zA-Z0-9]+)\n([^`]+)```")
	matches := codeBlockRegex.FindStringSubmatch(content)

	if len(matches) >= 3 {
		return &CodeBlock{
			Language: matches[1],
			Content:  strings.TrimSpace(matches[2]),
		}
	}
	return nil
}

func cleanResponseText(content string) string {
	// Remove code blocks from the response
	codeBlockRegex := regexp.MustCompile("```[a-zA-Z0-9]*\n[^`]+```")
	cleaned := codeBlockRegex.ReplaceAllString(content, "")
	// Clean up extra newlines
	cleaned = strings.TrimSpace(cleaned)
	return cleaned
}

func parseMarkdownTable(content string) *TableData {
	// Look for markdown table in the content
	tableRegex := regexp.MustCompile(`\|([^\n]+)\|\n\|([-|\s]+)\|\n((?:\|[^\n]+\|\n?)*)`)
	matches := tableRegex.FindStringSubmatch(content)

	if len(matches) < 4 {
		return nil
	}

	// Parse headers
	headers := strings.Split(strings.Trim(matches[1], "|"), "|")
	for i := range headers {
		headers[i] = strings.TrimSpace(headers[i])
	}

	// Parse rows
	rowsStr := strings.Split(matches[3], "\n")
	var rows [][]string
	for _, row := range rowsStr {
		if len(row) == 0 {
			continue
		}
		// Split row and trim whitespace
		cells := strings.Split(strings.Trim(row, "|"), "|")
		var cleanCells []string
		for _, cell := range cells {
			cleanCells = append(cleanCells, strings.TrimSpace(cell))
		}
		if len(cleanCells) > 0 {
			rows = append(rows, cleanCells)
		}
	}

	return &TableData{
		Headers: headers,
		Rows:    rows,
	}
}

func handleCheckRdmAccess(w http.ResponseWriter, r *http.Request) {
	organizationId := r.URL.Query().Get("organizationId")
	claims := r.Context().Value(claimsKey).(*Claims)

	query := `
        SELECT EXISTS(
            SELECT 1 
            FROM services.organization_services os
            JOIN auth.organizations o ON os.organization_id = o.id
            JOIN auth.organization_members om ON o.id = om.organization_id
            JOIN auth.users u ON om.user_id = u.id
            WHERE u.email = $1 
            AND os.service_id = (SELECT id FROM services.services WHERE name = 'rdm')
    `
	args := []interface{}{claims.Username}

	if organizationId != "" {
		query += " AND o.id = $2"
		args = append(args, organizationId)
	}

	query += ")"

	var hasAccess bool
	err := db.QueryRow(query, args...).Scan(&hasAccess)

	if err != nil {
		http.Error(w, "Error checking RDM access", http.StatusInternalServerError)
		return
	}

	if !hasAccess {
		w.WriteHeader(http.StatusForbidden)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func handleCreateFolder(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(claimsKey).(*Claims)

	var req struct {
		Name           string  `json:"name"`
		ParentID       *string `json:"parentId"`
		OrganizationID string  `json:"organizationId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Verify user has access to the organization
	var authorized bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM auth.organization_members om
            JOIN auth.users u ON u.id = om.user_id
            WHERE u.email = $1 AND om.organization_id = $2
        )
    `, claims.Username, req.OrganizationID).Scan(&authorized)

	if err != nil || !authorized {
		http.Error(w, "Unauthorized access to organization", http.StatusForbidden)
		return
	}

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// If parentID is provided, verify it belongs to the same organization
	if req.ParentID != nil {
		var parentOrgID string
		err := tx.QueryRow(`
            SELECT organization_id 
            FROM rdm.folders 
            WHERE id = $1
        `, req.ParentID).Scan(&parentOrgID)

		if err != nil {
			http.Error(w, "Parent folder not found", http.StatusNotFound)
			return
		}

		if parentOrgID != req.OrganizationID {
			http.Error(w, "Parent folder belongs to different organization", http.StatusBadRequest)
			return
		}
	}

	// Trim whitespace
	name := strings.TrimSpace(req.Name)
	if name == "" {
		http.Error(w, "Folder name cannot be blank", http.StatusBadRequest)
		return
	}

	// Check for duplicate names at the same level
	var duplicateExists bool
	err = tx.QueryRow(`
		SELECT EXISTS (
			SELECT 1 
			FROM rdm.folders 
			WHERE parent_id IS NOT DISTINCT FROM $1
			AND organization_id = $2
			AND name ILIKE $3
			AND deleted_at IS NULL  -- Only check against non-deleted folders
		)
	`, req.ParentID, req.OrganizationID, name).Scan(&duplicateExists)

	if err != nil {
		http.Error(w, "Error checking for duplicates", http.StatusInternalServerError)
		return
	}

	// If duplicate exists, find a unique name
	if duplicateExists {
		counter := 1
		baseName := name
		for duplicateExists {
			name = fmt.Sprintf("%s (%d)", baseName, counter)
			err = tx.QueryRow(`
				SELECT EXISTS (
					SELECT 1 
					FROM rdm.folders 
					WHERE parent_id IS NOT DISTINCT FROM $1
					AND organization_id = $2
					AND LOWER(name) = LOWER($3)
					AND deleted_at IS NULL  -- Only check against non-deleted folders
				)
			`, req.ParentID, req.OrganizationID, name).Scan(&duplicateExists)

			if err != nil {
				http.Error(w, "Error checking for duplicates", http.StatusInternalServerError)
				return
			}
			counter++
		}
	}

	// Create the folder
	var folderID string
	err = tx.QueryRow(`
        INSERT INTO rdm.folders (name, parent_id, organization_id)
        VALUES ($1, $2, $3)
        RETURNING id
    `, name, req.ParentID, req.OrganizationID).Scan(&folderID)

	if err != nil {
		log.Printf("Error creating folder: %v", err)
		http.Error(w, "Failed to create folder", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":             folderID,
		"name":           name,
		"parentId":       req.ParentID,
		"organizationId": req.OrganizationID,
	})
}

func handleGetUserRdmOrganizations(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(claimsKey).(*Claims)

	rows, err := db.Query(`
        SELECT DISTINCT o.id, o.name, o.description, o.created_at, o.updated_at
        FROM auth.organizations o
        JOIN auth.organization_members om ON o.id = om.organization_id
        JOIN auth.users u ON om.user_id = u.id
        JOIN services.organization_services os ON o.id = os.organization_id
        JOIN services.services s ON os.service_id = s.id
        WHERE u.email = $1 
        AND s.name = 'rdm'
        AND os.status = 'active'
        ORDER BY o.name
    `, claims.Username)

	if err != nil {
		http.Error(w, "Failed to fetch organizations", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var organizations []Organization
	for rows.Next() {
		var org Organization
		err := rows.Scan(&org.ID, &org.Name, &org.Description, &org.CreatedAt, &org.UpdatedAt)
		if err != nil {
			http.Error(w, "Error scanning organizations", http.StatusInternalServerError)
			return
		}
		organizations = append(organizations, org)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"organizations": organizations,
	})
}

func handleGetFolders(w http.ResponseWriter, r *http.Request) {
	organizationId := r.URL.Query().Get("organizationId")
	if organizationId == "" {
		http.Error(w, "Organization ID is required", http.StatusBadRequest)
		return
	}

	claims := r.Context().Value(claimsKey).(*Claims)

	var authorized bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 
			FROM auth.organization_members om
			JOIN auth.users u ON u.id = om.user_id
			WHERE u.email = $1 AND om.organization_id = $2
		)
	`, claims.Username, organizationId).Scan(&authorized)

	if err != nil || !authorized {
		http.Error(w, "Access denied to organization", http.StatusForbidden)
		return
	}

	rows, err := db.Query(`
    WITH RECURSIVE folder_tree AS (
        SELECT 
            f.id, 
            f.name, 
            f.parent_id, 
            f.organization_id,
            f.updated_at,
            (SELECT COUNT(*) FROM rdm.documents d 
             WHERE d.folder_id = f.id 
             AND d.deleted_at IS NULL) as file_count,
            (SELECT u.email FROM auth.users u 
             WHERE u.id = f.updated_by) as last_updated_by,
            ARRAY[f.name::text] as path
        FROM rdm.folders f
        WHERE f.parent_id IS NULL 
        AND f.organization_id = $1
        AND f.deleted_at IS NULL
        
        UNION ALL
        
        SELECT 
            f.id, 
            f.name, 
            f.parent_id, 
            f.organization_id,
            f.updated_at,
            (SELECT COUNT(*) FROM rdm.documents d WHERE d.folder_id = f.id) as file_count,
            (SELECT u.email FROM auth.users u WHERE u.id = f.updated_by) as last_updated_by,
            ft.path || f.name::text
        FROM rdm.folders f
        INNER JOIN folder_tree ft ON f.parent_id = ft.id
    )
    SELECT id, name, parent_id, organization_id, updated_at, file_count, last_updated_by
    FROM folder_tree
    ORDER BY path;
	`, organizationId)

	if err != nil {
		log.Printf("Error fetching folders: %v", err)
		http.Error(w, "Failed to fetch folders", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type FolderWithMetadata struct {
		ID             string    `json:"id"`
		Name           string    `json:"name"`
		ParentID       *string   `json:"parentId"`
		OrganizationID string    `json:"organizationId"`
		UpdatedAt      time.Time `json:"updatedAt"`
		FileCount      int       `json:"fileCount"`
		LastUpdatedBy  string    `json:"lastUpdatedBy"`
	}

	var folders []FolderWithMetadata
	for rows.Next() {
		var folder FolderWithMetadata
		var lastUpdated sql.NullString
		err := rows.Scan(
			&folder.ID,
			&folder.Name,
			&folder.ParentID,
			&folder.OrganizationID,
			&folder.UpdatedAt,
			&folder.FileCount,
			&lastUpdated,
		)
		if err != nil {
			log.Printf("Error scanning folder row: %v", err)
			continue
		}

		if lastUpdated.Valid {
			folder.LastUpdatedBy = lastUpdated.String
		} else {
			folder.LastUpdatedBy = ""
		}

		folders = append(folders, folder)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(folders)
}

func handleDeleteFolder(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(claimsKey).(*Claims)
	vars := mux.Vars(r)
	folderID := vars["id"]

	// Start a transaction
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Verify user has access to the folder
	var authorized bool
	err = tx.QueryRow(`
        SELECT EXISTS (
            SELECT 1
            FROM rdm.folders f
            JOIN auth.organization_members om ON f.organization_id = om.organization_id
            JOIN auth.users u ON u.id = om.user_id
            WHERE f.id = $1 AND u.email = $2
        )
    `, folderID, claims.Username).Scan(&authorized)

	if err != nil || !authorized {
		http.Error(w, "Folder not found or access denied", http.StatusForbidden)
		return
	}

	// Delete the folder and all its children (relies on CASCADE)
	_, err = tx.Exec("DELETE FROM rdm.folders WHERE id = $1", folderID)
	if err != nil {
		log.Printf("Error deleting folder: %v", err)
		http.Error(w, "Failed to delete folder", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func handleRenameFolder(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(claimsKey).(*Claims)
	vars := mux.Vars(r)
	folderID := vars["id"]

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// First, get the current folder's details
	var currentFolder Folder
	err = tx.QueryRow(`
        SELECT id, name, parent_id, organization_id
        FROM rdm.folders 
        WHERE id = $1
    `, folderID).Scan(&currentFolder.ID, &currentFolder.Name, &currentFolder.ParentID, &currentFolder.OrganizationID)

	if err != nil {
		http.Error(w, "Folder not found", http.StatusNotFound)
		return
	}

	// Verify user has access
	var authorized bool
	err = tx.QueryRow(`
        SELECT EXISTS (
            SELECT 1
            FROM rdm.folders f
            JOIN auth.organization_members om ON f.organization_id = om.organization_id
            JOIN auth.users u ON u.id = om.user_id
            WHERE f.id = $1 AND u.email = $2
        )
    `, folderID, claims.Username).Scan(&authorized)

	if err != nil || !authorized {
		http.Error(w, "Folder not found or access denied", http.StatusForbidden)
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Trim whitespace
	newName := strings.TrimSpace(req.Name)
	if newName == "" {
		http.Error(w, "Folder name cannot be blank", http.StatusBadRequest)
		return
	}

	// Check for duplicate names at the same level
	var duplicateExists bool
	err = tx.QueryRow(`
    SELECT EXISTS (
        SELECT 1 
        FROM rdm.folders 
        WHERE parent_id IS NOT DISTINCT FROM $1
        AND organization_id = $2
        AND name ILIKE $3
        AND id != $4
    )
	`, currentFolder.ParentID, currentFolder.OrganizationID, newName, folderID).Scan(&duplicateExists)

	if err != nil {
		http.Error(w, "Error checking for duplicates", http.StatusInternalServerError)
		return
	}

	if duplicateExists {
		// Find a unique name
		counter := 1
		baseName := newName
		for duplicateExists {
			newName = fmt.Sprintf("%s (%d)", baseName, counter)
			err = tx.QueryRow(`
                SELECT EXISTS (
                    SELECT 1 
                    FROM rdm.folders 
                    WHERE parent_id IS NOT DISTINCT FROM $1
                    AND organization_id = $2
                    AND LOWER(name) = LOWER($3)
                    AND id != $4
                )
            `, currentFolder.ParentID, currentFolder.OrganizationID, newName, folderID).Scan(&duplicateExists)

			if err != nil {
				http.Error(w, "Error checking for duplicates", http.StatusInternalServerError)
				return
			}
			counter++
		}
	}

	// Update the folder with the new name
	_, err = tx.Exec(`
        UPDATE rdm.folders 
        SET name = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
    `, newName, folderID)

	if err != nil {
		log.Printf("Error renaming folder: %v", err)
		http.Error(w, "Failed to rename folder", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	// Return the new name in the response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"id":   folderID,
		"name": newName,
	})
}

func handleRenameDocument(w http.ResponseWriter, r *http.Request) {
	log.Printf("Starting rename document handler")
	claims := r.Context().Value(claimsKey).(*Claims)
	vars := mux.Vars(r)
	documentId := vars["id"]

	var req struct {
		Name           string `json:"name"`
		OrganizationID string `json:"organizationId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Failed to decode request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("Rename request received: documentId=%s, newName=%s, orgId=%s",
		documentId, req.Name, req.OrganizationID)

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Get current document details
	var currentBlobUrl string
	var currentName string
	var organizationId string
	err = tx.QueryRow(`
        SELECT file_path, name, organization_id
        FROM rdm.documents 
        WHERE id = $1
        AND deleted_at IS NULL
    `, documentId).Scan(&currentBlobUrl, &currentName, &organizationId)
	if err != nil {
		http.Error(w, "Document not found", http.StatusNotFound)
		return
	}

	// Verify user has access
	var authorized bool
	err = tx.QueryRow(`
        SELECT EXISTS (
            SELECT 1
            FROM rdm.documents d
            JOIN auth.organization_members om ON d.organization_id = om.organization_id
            JOIN auth.users u ON u.id = om.user_id
            WHERE d.id = $1 
            AND d.organization_id = $2
            AND u.email = $3
            AND d.deleted_at IS NULL
        )
    `, documentId, req.OrganizationID, claims.Username).Scan(&authorized)
	if err != nil || !authorized {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	// Validate and enforce file extension
	currentExt := filepath.Ext(currentName)
	proposedExt := filepath.Ext(req.Name)
	if proposedExt != currentExt {
		baseName := strings.TrimSuffix(req.Name, proposedExt)
		req.Name = baseName + currentExt
	}

	// Check for duplicate names in the same folder
	var duplicateExists bool
	err = tx.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.documents 
            WHERE folder_id = (
                SELECT folder_id 
                FROM rdm.documents 
                WHERE id = $1
            )
            AND organization_id = $2
            AND name = $3
            AND id != $1
            AND deleted_at IS NULL
        )
    `, documentId, req.OrganizationID, req.Name).Scan(&duplicateExists)
	if err != nil {
		http.Error(w, "Error checking for duplicates", http.StatusInternalServerError)
		return
	}
	if duplicateExists {
		http.Error(w, "A document with this name already exists in this folder", http.StatusConflict)
		return
	}

	// Initialize Azure Blob client
	client, containerName, err := getBlobClient(organizationId)
	if err != nil {
		http.Error(w, "Failed to initialize storage", http.StatusInternalServerError)
		return
	}

	// Parse the current blob URL from the database.
	// Expected format:
	// "https://teststorage.blob.core.windows.net/container name/2025%2F02%2F01%2F70660b1d-a183-12w5-e89z-ff538f3218c8_view.pdf"
	parsedUrl, err := url.Parse(currentBlobUrl)
	if err != nil {
		http.Error(w, "Invalid blob URL", http.StatusInternalServerError)
		return
	}

	// Build the expected prefix (e.g. "/container name/")
	expectedPrefix := fmt.Sprintf("/%s/", containerName)
	if !strings.HasPrefix(parsedUrl.Path, expectedPrefix) {
		log.Printf("Blob URL path '%s' does not have expected prefix '%s'", parsedUrl.Path, expectedPrefix)
		http.Error(w, "Invalid blob URL structure", http.StatusInternalServerError)
		return
	}

	// Remove the container name prefix.
	// For example, if parsedUrl.Path is:
	// "/container name/2025%2F02%2F01%2F70660b1d-a183-12w5-e89z-ff538f3218c8_view.pdf"
	// this yields "2025%2F02%2F01%2F70660b1d-a183-12w5-e89z-ff538f3218c8_view.pdf"
	encodedBlobName := strings.TrimPrefix(parsedUrl.Path, expectedPrefix)

	// Decode the URL-encoded blob name to get the proper subdirectory structure.
	decodedBlobName, err := url.PathUnescape(encodedBlobName)
	if err != nil {
		log.Printf("Failed to decode blob name '%s': %v", encodedBlobName, err)
		http.Error(w, "Failed to decode blob name", http.StatusInternalServerError)
		return
	}
	log.Printf("Decoded blob name: %s", decodedBlobName)

	// Split the decoded blob name into its parts.
	// Expected format: "YYYY/MM/DD/filename"
	// Split the decoded blob name into its parts.
	// Expected format: "documents/YYYY/MM/DD/filename"
	pathParts := strings.Split(decodedBlobName, "/")
	if len(pathParts) != 5 || pathParts[0] != "documents" {
		log.Printf("Unexpected blob path structure: %s", decodedBlobName)
		timestamp := time.Now()
		pathParts = []string{
			"documents",
			fmt.Sprintf("%d", timestamp.Year()),
			fmt.Sprintf("%02d", timestamp.Month()),
			fmt.Sprintf("%02d", timestamp.Day()),
			fmt.Sprintf("%s_%s", uuid.New().String(), req.Name),
		}
	} else {
		// Replace only the filename (the 5th element) with a new unique name.
		pathParts[4] = fmt.Sprintf("%s_%s", uuid.New().String(), req.Name)
	}
	newBlobPath := strings.Join(pathParts, "/")
	log.Printf("New blob path: %s", newBlobPath)

	// Get container client
	containerClient := client.ServiceClient().NewContainerClient(containerName)

	// Create blob clients for the source and destination.
	// Note: The source blob name remains URL-encoded.
	sourceBlobClient := containerClient.NewBlobClient(encodedBlobName)
	destBlobClient := containerClient.NewBlobClient(newBlobPath)

	// Copy the blob to the new location.
	_, err = destBlobClient.StartCopyFromURL(context.Background(), sourceBlobClient.URL(), nil)
	if err != nil {
		http.Error(w, "Failed to copy blob", http.StatusInternalServerError)
		return
	}

	// Wait for the copy operation to complete.
	for {
		props, err := destBlobClient.GetProperties(context.Background(), nil)
		if err != nil {
			http.Error(w, "Failed to get blob properties", http.StatusInternalServerError)
			return
		}
		if props.CopyStatus != nil && *props.CopyStatus == "success" {
			break
		}
		time.Sleep(time.Second)
	}

	// Delete the old blob.
	_, err = sourceBlobClient.Delete(context.Background(), nil)
	if err != nil {
		log.Printf("Warning: Failed to delete old blob: %v", err)
	}

	// Update the document record in the database.
	res, err := tx.Exec(`
    UPDATE rdm.documents 
    SET name = $1,
        file_path = $2,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = (SELECT id FROM auth.users WHERE email = $3)
    WHERE id = $4
	`, req.Name, destBlobClient.URL(), claims.Username, documentId)
	if err != nil {
		log.Printf("Failed to update document record: %v", err)
		http.Error(w, "Failed to update document record", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
	}
	if rowsAffected == 0 {
		log.Printf("No rows updated for document id %s", documentId)
		http.Error(w, "Document update did not affect any rows", http.StatusInternalServerError)
		return
	}

	// Commit the transaction.
	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Document renamed successfully",
		"newUrl":  destBlobClient.URL(),
	})
}

func handleMoveFolderStructure(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(claimsKey).(*Claims)
	vars := mux.Vars(r)
	folderID := vars["id"]

	var req struct {
		NewParentID *string `json:"newParentId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Start a transaction
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Verify user has access to both folders
	var authorized bool
	err = tx.QueryRow(`
        SELECT EXISTS (
            SELECT 1
            FROM rdm.folders f
            JOIN auth.organization_members om ON f.organization_id = om.organization_id
            JOIN auth.users u ON u.id = om.user_id
            WHERE f.id = $1 AND u.email = $2
        )
    `, folderID, claims.Username).Scan(&authorized)

	if err != nil || !authorized {
		http.Error(w, "Folder not found or access denied", http.StatusForbidden)
		return
	}

	// If moving to a new parent, verify access to parent folder
	if req.NewParentID != nil {
		err = tx.QueryRow(`
            SELECT EXISTS (
                SELECT 1
                FROM rdm.folders f
                JOIN auth.organization_members om ON f.organization_id = om.organization_id
                JOIN auth.users u ON u.id = om.user_id
                WHERE f.id = $1 AND u.email = $2
            )
        `, req.NewParentID, claims.Username).Scan(&authorized)

		if err != nil || !authorized {
			http.Error(w, "Parent folder not found or access denied", http.StatusForbidden)
			return
		}
	}

	// Update the folder's parent
	_, err = tx.Exec(`
        UPDATE rdm.folders 
        SET parent_id = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
    `, req.NewParentID, folderID)

	if err != nil {
		log.Printf("Error moving folder: %v", err)
		http.Error(w, "Failed to move folder", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func handleGetDocuments(w http.ResponseWriter, r *http.Request) {
	organizationId := r.URL.Query().Get("organizationId")
	folderId := r.URL.Query().Get("folderId")

	if organizationId == "" {
		http.Error(w, "Organization ID is required", http.StatusBadRequest)
		return
	}

	claims := r.Context().Value(claimsKey).(*Claims)

	// Verify user has access to the organization
	var authorized bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM auth.organization_members om
            JOIN auth.users u ON u.id = om.user_id
            WHERE u.email = $1 AND om.organization_id = $2
        )
    `, claims.Username, organizationId).Scan(&authorized)

	if err != nil || !authorized {
		http.Error(w, "Access denied to organization", http.StatusForbidden)
		return
	}

	// Build the query based on whether a folder ID is provided
	query := `
    SELECT 
        d.id,
        d.name,
        d.file_type,
        d.file_size,
        d.version,
        d.updated_at,
        d.folder_id,
        d.organization_id
    FROM rdm.documents d
    WHERE d.organization_id = $1
    AND d.deleted_at IS NULL
	`
	args := []interface{}{organizationId}

	if folderId != "" {
		query += " AND d.folder_id = $2"
		args = append(args, folderId)
	}

	query += " ORDER BY d.updated_at DESC"

	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("Error querying documents: %v", err)
		http.Error(w, "Failed to fetch documents", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Document struct {
		ID             string    `json:"id"`
		Name           string    `json:"name"`
		FileType       string    `json:"fileType"`
		FileSize       int64     `json:"fileSize"`
		Version        int       `json:"version"`
		UpdatedAt      time.Time `json:"updatedAt"`
		FolderID       *string   `json:"folderId"`
		OrganizationID string    `json:"organizationId"`
	}

	var documents []Document

	for rows.Next() {
		var doc Document
		if err := rows.Scan(
			&doc.ID,
			&doc.Name,
			&doc.FileType,
			&doc.FileSize,
			&doc.Version,
			&doc.UpdatedAt,
			&doc.FolderID,
			&doc.OrganizationID,
		); err != nil {
			log.Printf("Error scanning document row: %v", err)
			continue
		}
		documents = append(documents, doc)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(documents)
}

func handleUploadDocument(w http.ResponseWriter, r *http.Request) {
	organizationId := r.FormValue("organizationId")
	folderId := r.FormValue("folderId")
	if organizationId == "" {
		log.Println("Missing organizationId in request")
		http.Error(w, "Organization ID is required", http.StatusBadRequest)
		return
	}

	claims := r.Context().Value(claimsKey).(*Claims)
	log.Printf("User %s is attempting to upload a document to organization %s", claims.Username, organizationId)

	var authorized bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM auth.organization_members om
            JOIN auth.users u ON u.id = om.user_id
            WHERE u.email = $1 AND om.organization_id = $2
        )
    `, claims.Username, organizationId).Scan(&authorized)
	if err != nil {
		log.Printf("Error checking authorization: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	if !authorized {
		log.Printf("User %s is not authorized for organization %s", claims.Username, organizationId)
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		log.Printf("Failed to retrieve file from request: %v", err)
		http.Error(w, "Failed to get file from request", http.StatusBadRequest)
		return
	}
	defer file.Close()
	log.Printf("File %s received for upload", header.Filename)

	// Read the file into memory so we can both compute the checksum and perform the upload.
	data, err := io.ReadAll(file)
	if err != nil {
		log.Printf("Failed to read file content: %v", err)
		http.Error(w, "Failed to read file", http.StatusInternalServerError)
		return
	}

	// Compute the checksum.
	hasher := sha256.New()
	hasher.Write(data)
	checksum := hex.EncodeToString(hasher.Sum(nil))
	log.Printf("Checksum for file %s: %s", header.Filename, checksum)

	// Wrap the data into a reader that implements io.ReadSeekCloser.
	src := nopReadSeekCloser{bytes.NewReader(data)}

	// Get the blob client and container name.
	client, containerName, err := getBlobClient(organizationId)
	if err != nil {
		log.Printf("Error initializing Azure client: %v", err)
		http.Error(w, "Failed to initialize storage", http.StatusInternalServerError)
		return
	}

	// Log the container name.
	log.Printf("Using container: %s", containerName)

	// Ensure the container exists.
	containerClient := client.ServiceClient().NewContainerClient(containerName)
	_, err = containerClient.Create(context.Background(), nil)
	if err != nil {
		// If the container already exists, the error can be ignored.
		log.Printf("Container creation error (may already exist): %v", err)
	}

	// Build the blob name.
	timestamp := time.Now().Format("2006/01/02")
	blobName := fmt.Sprintf("documents/%s/%s_%s",
		timestamp,
		uuid.New().String(),
		header.Filename,
	)
	log.Printf("Uploading file %s to blob %s in container %s", header.Filename, blobName, containerName)

	// Get a BlockBlobClient.
	blockBlobClient := containerClient.NewBlockBlobClient(blobName)

	// Set upload options.
	uploadOptions := &azblob.UploadStreamOptions{
		BlockSize:   4 * 1024 * 1024, // 4 MiB
		Concurrency: 3,
	}

	// Use the client's UploadStream method.
	_, err = client.UploadStream(context.Background(), containerName, blobName, src, uploadOptions)
	if err != nil {
		log.Printf("UploadStream failed for blob %s: %v", blobName, err)
		http.Error(w, "Failed to upload to Azure", http.StatusInternalServerError)
		return
	}
	log.Printf("Upload succeeded for blob %s", blobName)

	// Prepare folderId: if it's empty, pass nil so the UUID column receives a NULL.
	var folderParam interface{}
	if folderId == "" {
		folderParam = nil
	} else {
		folderParam = folderId
	}

	// Insert document record in database.
	tx, err := db.Begin()
	if err != nil {
		log.Printf("Failed to start DB transaction: %v", err)
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var documentId string
	err = tx.QueryRow(`
        INSERT INTO rdm.documents (
            name, original_file_name, file_path, file_type, mime_type,
            file_size, checksum, version, folder_id, organization_id,
            created_by, upload_ip, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9, 
            (SELECT id FROM auth.users WHERE email = $10), $11, $12)
        RETURNING id
    `,
		header.Filename,
		header.Filename,
		blockBlobClient.URL(),
		filepath.Ext(header.Filename),
		header.Header.Get("Content-Type"),
		header.Size,
		checksum,
		folderParam,
		organizationId,
		claims.Username,
		r.RemoteAddr,
		r.UserAgent(),
	).Scan(&documentId)
	if err != nil {
		log.Printf("Failed to insert document record: %v", err)
		http.Error(w, "Failed to create document record", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}
	log.Printf("Document record created with ID %s", documentId)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":             documentId,
		"name":           header.Filename,
		"fileType":       filepath.Ext(header.Filename),
		"fileSize":       header.Size,
		"blobUrl":        blockBlobClient.URL(),
		"version":        1,
		"folderId":       folderId,
		"organizationId": organizationId,
	})
}

func handleUpdateDocument(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	documentId := vars["id"]

	if documentId == "" {
		http.Error(w, "Document ID is required", http.StatusBadRequest)
		return
	}

	claims := r.Context().Value(claimsKey).(*Claims)

	var organizationId string
	err := db.QueryRow(`
        SELECT organization_id 
        FROM rdm.documents 
        WHERE id = $1
    `, documentId).Scan(&organizationId)
	if err != nil {
		http.Error(w, "Document not found or error fetching document", http.StatusNotFound)
		return
	}

	var authorized bool
	err = db.QueryRow(`
        SELECT EXISTS (
            SELECT 1
            FROM auth.organization_members om
            JOIN auth.users u ON u.id = om.user_id
            WHERE u.email = $1 AND om.organization_id = $2
        )
    `, claims.Username, organizationId).Scan(&authorized)
	if err != nil || !authorized {
		http.Error(w, "Access denied to organization", http.StatusForbidden)
		return
	}

	client, containerName, err := getBlobClient(organizationId)
	if err != nil {
		http.Error(w, "Failed to initialize storage", http.StatusInternalServerError)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Failed to get file from request", http.StatusBadRequest)
		return
	}
	defer file.Close()

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var currentVersion int
	var currentBlobPath string
	err = tx.QueryRow(`
        SELECT version, file_path 
        FROM rdm.documents 
        WHERE id = $1
    `, documentId).Scan(&currentVersion, &currentBlobPath)
	if err != nil {
		http.Error(w, "Failed to get current document version", http.StatusInternalServerError)
		return
	}

	srcBlobClient := client.ServiceClient().NewContainerClient(containerName).NewBlobClient(currentBlobPath)
	dstBlobClient := client.ServiceClient().NewContainerClient(containerName).NewBlobClient(fmt.Sprintf("versions/%s/v%d_%s",
		documentId,
		currentVersion,
		filepath.Base(currentBlobPath)))

	_, err = dstBlobClient.StartCopyFromURL(context.Background(), srcBlobClient.URL(), nil)
	if err != nil {
		http.Error(w, "Failed to archive current version", http.StatusInternalServerError)
		return
	}

	timestamp := time.Now().Format("2006/01/02")
	newBlobName := fmt.Sprintf("documents/%s/%s_%s",
		timestamp,
		uuid.New().String(),
		header.Filename)

	blobClient := client.ServiceClient().NewContainerClient(containerName).NewBlockBlobClient(newBlobName)
	_, err = blobClient.Upload(context.Background(), file, nil)
	if err != nil {
		http.Error(w, "Failed to upload new version", http.StatusInternalServerError)
		return
	}

	hasher := sha256.New()
	if _, err := io.Copy(hasher, file); err != nil {
		http.Error(w, "Failed to compute checksum", http.StatusInternalServerError)
		return
	}
	checksum := hex.EncodeToString(hasher.Sum(nil))

	_, err = tx.Exec(`
        INSERT INTO rdm.document_versions (
            document_id,
            version,
            file_path,
            file_type,
            file_size,
            checksum,
            created_by
        )
        SELECT 
            id, 
            version, 
            file_path, 
            file_type, 
            file_size, 
            checksum, 
            created_by
        FROM rdm.documents
        WHERE id = $1
    `, documentId)
	if err != nil {
		http.Error(w, "Failed to archive current version metadata", http.StatusInternalServerError)
		return
	}

	newVersion := currentVersion + 1
	blobURL := blobClient.URL()
	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	_, err = tx.Exec(`
        UPDATE rdm.documents
        SET 
            original_file_name = $1,
            file_path = $2,
            file_type = $3,
            mime_type = $4,
            file_size = $5,
            checksum = $6,
            version = $7,
            upload_ip = $8,
            user_agent = $9,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = (SELECT id FROM auth.users WHERE email = $10)
        WHERE id = $11
    `,
		header.Filename,
		blobURL,
		filepath.Ext(header.Filename),
		mimeType,
		header.Size,
		checksum,
		newVersion,
		r.RemoteAddr,
		r.UserAgent(),
		claims.Username,
		documentId,
	)
	if err != nil {
		http.Error(w, "Failed to update document record", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":             documentId,
		"version":        newVersion,
		"filePath":       blobURL,
		"fileType":       filepath.Ext(header.Filename),
		"fileSize":       header.Size,
		"mimeType":       mimeType,
		"checksum":       checksum,
		"organizationId": organizationId,
	})
}

func handleDeleteDocument(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	documentId := vars["id"]

	// Get user claims from context.
	claimsVal := r.Context().Value(claimsKey)
	claims, ok := claimsVal.(*Claims)
	if !ok || claims == nil {
		http.Error(w, "Unauthorized claim", http.StatusUnauthorized)
		return
	}

	// Look up document info.
	var organizationId, blobUrl string
	err := db.QueryRow(`
        SELECT organization_id, file_path
        FROM rdm.documents 
        WHERE id = $1
    `, documentId).Scan(&organizationId, &blobUrl)
	if err != nil {
		http.Error(w, "Document not found", http.StatusNotFound)
		return
	}

	// Verify user's authorization.
	var authorized bool
	err = db.QueryRow(`
        SELECT EXISTS (
            SELECT 1
            FROM auth.organization_members om
            JOIN auth.users u ON om.user_id = u.id
            WHERE u.email = $1 AND om.organization_id = $2
        )
    `, claims.Username, organizationId).Scan(&authorized)
	if err != nil || !authorized {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	// Begin a transaction.
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	committed := false
	defer func() {
		if !committed {
			tx.Rollback()
		}
	}()

	// Initialize the Azure Blob Storage client.
	client, containerName, err := getBlobClient(organizationId)
	if err != nil {
		http.Error(w, "Failed to initialize storage client", http.StatusInternalServerError)
		return
	}

	// Parse the blob URL to get the blob name.
	parsedUrl, err := url.Parse(blobUrl)
	if err != nil {
		http.Error(w, "Invalid blob URL", http.StatusInternalServerError)
		return
	}
	// Assume blobUrl is in format: "https://<account>.blob.core.windows.net/container/blobName"
	blobName := strings.TrimPrefix(parsedUrl.Path, fmt.Sprintf("/%s/", containerName))
	if !strings.HasPrefix(blobName, "documents/") {
		log.Printf("Blob name '%s' does not have expected 'documents/' prefix", blobName)
		http.Error(w, "Invalid blob name format", http.StatusInternalServerError)
		return
	}

	// Delete the main blob.
	blobClient := client.ServiceClient().NewContainerClient(containerName).NewBlockBlobClient(blobName)
	_, err = blobClient.Delete(context.Background(), nil)
	if err != nil {
		log.Printf("Failed to delete blob: %v", err)
		http.Error(w, "Failed to delete file from storage", http.StatusInternalServerError)
		return
	}

	// Delete versioned blobs using our helper.
	versionPrefix := fmt.Sprintf("versions/%s/", documentId)
	if err = deleteBlobsWithPrefix(context.Background(), client, containerName, versionPrefix); err != nil {
		log.Printf("Error deleting version blobs: %v", err)
		// Optionally, continue even if some versions fail to delete.
	}

	// Delete the document record from the database.
	_, err = tx.Exec(`DELETE FROM rdm.documents WHERE id = $1`, documentId)
	if err != nil {
		http.Error(w, "Failed to delete document record", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}
	committed = true

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(Response{
		Success: true,
		Message: "Document and all versions successfully deleted",
	})
}

func deleteBlobsWithPrefix(ctx context.Context, client *azblob.Client, containerName, prefix string) error {
	// Get a container client.
	containerClient := client.ServiceClient().NewContainerClient(containerName)
	// Create a pager using the container package's options.
	pager := containerClient.NewListBlobsHierarchyPager("/", &container.ListBlobsHierarchyOptions{
		Prefix: to.Ptr(prefix),
	})

	// Iterate over each page.
	for pager.More() {
		resp, err := pager.NextPage(ctx)
		if err != nil {
			return fmt.Errorf("failed to list blobs: %w", err)
		}
		// If there are virtual directories (blob prefixes), recursively delete them.
		if resp.Segment.BlobPrefixes != nil {
			for _, p := range resp.Segment.BlobPrefixes {
				if p.Name != nil {
					if err := deleteBlobsWithPrefix(ctx, client, containerName, *p.Name); err != nil {
						// Log and continue.
						log.Printf("error deleting blobs for prefix %s: %v", *p.Name, err)
					}
				}
			}
		}
		// Delete each blob in this page.
		for _, blobItem := range resp.Segment.BlobItems {
			if blobItem.Name == nil {
				continue
			}
			blobClient := containerClient.NewBlockBlobClient(*blobItem.Name)
			_, err := blobClient.Delete(ctx, nil)
			if err != nil {
				log.Printf("failed to delete blob %s: %v", *blobItem.Name, err)
			} else {
				log.Printf("deleted blob %s", *blobItem.Name)
			}
		}
	}
	return nil
}

func handleDownloadDocument(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	documentId := vars["id"]

	claims := r.Context().Value(claimsKey).(*Claims)

	// Get document info and verify access
	var organizationId string
	var blobUrl string
	var fileName string
	err := db.QueryRow(`
        SELECT organization_id, file_path, name
        FROM rdm.documents
        WHERE id = $1
    `, documentId).Scan(&organizationId, &blobUrl, &fileName)

	if err == sql.ErrNoRows {
		http.Error(w, "Document not found", http.StatusNotFound)
		return
	}

	var authorized bool
	err = db.QueryRow(`
        SELECT EXISTS (
            SELECT 1
            FROM auth.organization_members om
            JOIN auth.users u ON om.user_id = u.id
            WHERE u.email = $1 AND om.organization_id = $2
        )
    `, claims.Username, organizationId).Scan(&authorized)

	if err != nil || !authorized {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	// Get Azure client
	client, containerName, err := getBlobClient(organizationId)
	if err != nil {
		http.Error(w, "Failed to initialize storage", http.StatusInternalServerError)
		return
	}

	// Parse URL to get blob name
	parsedUrl, err := url.Parse(blobUrl)
	if err != nil {
		http.Error(w, "Invalid blob URL", http.StatusInternalServerError)
		return
	}
	blobName := strings.TrimPrefix(parsedUrl.Path, fmt.Sprintf("/%s/", containerName))
	if !strings.HasPrefix(blobName, "documents/") {
		log.Printf("Blob name '%s' does not have expected 'documents/' prefix", blobName)
		http.Error(w, "Invalid blob name format", http.StatusInternalServerError)
		return
	}

	// Get blob client
	blobClient := client.ServiceClient().NewContainerClient(containerName).NewBlockBlobClient(blobName)

	// Get blob properties first to get content length and type
	props, err := blobClient.GetProperties(context.Background(), nil)
	if err != nil {
		http.Error(w, "Failed to get blob properties", http.StatusInternalServerError)
		return
	}

	// Download the blob
	downloadResponse, err := blobClient.DownloadStream(context.Background(), nil)
	if err != nil {
		http.Error(w, "Failed to download blob", http.StatusInternalServerError)
		return
	}
	defer downloadResponse.Body.Close()

	// Set response headers with proper pointer dereferencing
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, fileName))
	if props.ContentType != nil {
		w.Header().Set("Content-Type", *props.ContentType)
	} else {
		w.Header().Set("Content-Type", "application/octet-stream")
	}
	if props.ContentLength != nil {
		w.Header().Set("Content-Length", fmt.Sprintf("%d", *props.ContentLength))
	}
	w.Header().Set("Cache-Control", "no-cache")

	// Use io.Copy to stream the response
	written, err := io.Copy(w, downloadResponse.Body)
	if err != nil {
		log.Printf("Error streaming blob (wrote %d bytes): %v", written, err)
		// Note: Cannot send error response here as headers are already sent
		return
	}

	if props.ContentLength != nil && written != *props.ContentLength {
		log.Printf("Warning: Content length mismatch. Expected %d bytes, wrote %d bytes",
			*props.ContentLength, written)
	}
}

// Handler for moving document to trash
func handleTrashDocument(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	documentId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Get user ID
	var userId string
	err := db.QueryRow(
		"SELECT id FROM auth.users WHERE email = $1",
		claims.Username,
	).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Soft delete the document
	_, err = db.Exec(`
        UPDATE rdm.documents 
        SET deleted_at = CURRENT_TIMESTAMP, 
            deleted_by = $1 
        WHERE id = $2
    `, userId, documentId)

	if err != nil {
		http.Error(w, "Failed to trash document", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// Handler for restoring document from trash
func handleRestoreDocument(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	documentId := vars["id"]

	_, err := db.Exec(`
        UPDATE rdm.documents 
        SET deleted_at = NULL, 
            deleted_by = NULL 
        WHERE id = $1
    `, documentId)

	if err != nil {
		http.Error(w, "Failed to restore document", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// Handler for moving folder to trash
func handleTrashFolder(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	folderId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Get user ID
	var userId string
	err := db.QueryRow(
		"SELECT id FROM auth.users WHERE email = $1",
		claims.Username,
	).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Soft delete the folder and all its contents
	_, err = tx.Exec(`
        WITH RECURSIVE folder_tree AS (
            SELECT id FROM rdm.folders WHERE id = $1
            UNION ALL
            SELECT f.id FROM rdm.folders f
            INNER JOIN folder_tree ft ON f.parent_id = ft.id
        )
        UPDATE rdm.folders 
        SET deleted_at = CURRENT_TIMESTAMP,
            deleted_by = $2
        WHERE id IN (SELECT id FROM folder_tree)
    `, folderId, userId)

	if err != nil {
		http.Error(w, "Failed to trash folder", http.StatusInternalServerError)
		return
	}

	// Soft delete all documents in the folder tree
	_, err = tx.Exec(`
        WITH RECURSIVE folder_tree AS (
            SELECT id FROM rdm.folders WHERE id = $1
            UNION ALL
            SELECT f.id FROM rdm.folders f
            INNER JOIN folder_tree ft ON f.parent_id = ft.id
        )
        UPDATE rdm.documents
        SET deleted_at = CURRENT_TIMESTAMP,
            deleted_by = $2
        WHERE folder_id IN (SELECT id FROM folder_tree)
    `, folderId, userId)

	if err != nil {
		http.Error(w, "Failed to trash folder contents", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// Handler for getting trash items
func handleGetTrashItems(w http.ResponseWriter, r *http.Request) {
	organizationId := r.URL.Query().Get("organizationId")

	type TrashItem struct {
		ID        string    `json:"id"`
		Name      string    `json:"name"`
		Type      string    `json:"type"`
		DeletedAt time.Time `json:"deletedAt"`
		DeletedBy string    `json:"deletedBy"`
	}

	var items []TrashItem

	// Get trashed folders
	rows, err := db.Query(`
        SELECT f.id, f.name, 'folder' as type, f.deleted_at, u.email as deleted_by
        FROM rdm.folders f
        JOIN auth.users u ON f.deleted_by = u.id
        WHERE f.organization_id = $1 
        AND f.deleted_at IS NOT NULL
        ORDER BY f.deleted_at DESC
    `, organizationId)

	if err != nil {
		http.Error(w, "Failed to fetch trash items", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var item TrashItem
		err := rows.Scan(&item.ID, &item.Name, &item.Type, &item.DeletedAt, &item.DeletedBy)
		if err != nil {
			continue
		}
		items = append(items, item)
	}

	// Get trashed documents
	rows, err = db.Query(`
        SELECT d.id, d.name, 'document' as type, d.deleted_at, u.email as deleted_by
        FROM rdm.documents d
        JOIN auth.users u ON d.deleted_by = u.id
        WHERE d.organization_id = $1 
        AND d.deleted_at IS NOT NULL
        ORDER BY d.deleted_at DESC
    `, organizationId)

	if err != nil {
		http.Error(w, "Failed to fetch trash items", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var item TrashItem
		err := rows.Scan(&item.ID, &item.Name, &item.Type, &item.DeletedAt, &item.DeletedBy)
		if err != nil {
			continue
		}
		items = append(items, item)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}

func deleteDocumentBlobs(client *azblob.Client, containerName string, docId string, blobUrl string) error {
	// Parse the blob URL to get the blob name
	parsedUrl, err := url.Parse(blobUrl)
	if err != nil {
		return fmt.Errorf("invalid blob URL: %v", err)
	}

	// Get blob name from URL
	blobName := strings.TrimPrefix(parsedUrl.Path, fmt.Sprintf("/%s/", containerName))
	if blobName == "" {
		return fmt.Errorf("invalid blob name")
	}

	// Delete the main blob
	blobClient := client.ServiceClient().NewContainerClient(containerName).NewBlockBlobClient(blobName)
	_, err = blobClient.Delete(context.Background(), nil)
	if err != nil {
		return fmt.Errorf("failed to delete blob: %v", err)
	}

	// Delete versioned blobs
	versionPrefix := fmt.Sprintf("versions/%s/", docId)
	if err = deleteBlobsWithPrefix(context.Background(), client, containerName, versionPrefix); err != nil {
		return fmt.Errorf("failed to delete version blobs: %v", err)
	}

	return nil
}

func handleRestoreFolder(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	folderId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)
	organizationId := r.URL.Query().Get("organizationId")

	if organizationId == "" {
		http.Error(w, "Organization ID is required", http.StatusBadRequest)
		return
	}

	// Verify user has access
	var authorized bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM auth.organization_members om
            JOIN auth.users u ON u.id = om.user_id
            WHERE u.email = $1 AND om.organization_id = $2
        )
    `, claims.Username, organizationId).Scan(&authorized)

	if err != nil || !authorized {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Restore the folder and all its contents
	_, err = tx.Exec(`
        WITH RECURSIVE folder_tree AS (
            SELECT id FROM rdm.folders WHERE id = $1
            UNION ALL
            SELECT f.id FROM rdm.folders f
            INNER JOIN folder_tree ft ON f.parent_id = ft.id
        )
        UPDATE rdm.folders 
        SET deleted_at = NULL,
            deleted_by = NULL
        WHERE id IN (SELECT id FROM folder_tree)
    `, folderId)

	if err != nil {
		http.Error(w, "Failed to restore folder", http.StatusInternalServerError)
		return
	}

	// Restore all documents in the folder tree
	_, err = tx.Exec(`
        WITH RECURSIVE folder_tree AS (
            SELECT id FROM rdm.folders WHERE id = $1
            UNION ALL
            SELECT f.id FROM rdm.folders f
            INNER JOIN folder_tree ft ON f.parent_id = ft.id
        )
        UPDATE rdm.documents
        SET deleted_at = NULL,
            deleted_by = NULL
        WHERE folder_id IN (SELECT id FROM folder_tree)
    `, folderId)

	if err != nil {
		http.Error(w, "Failed to restore folder contents", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func handlePermanentDelete(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(claimsKey).(*Claims)
	vars := mux.Vars(r)
	itemId := vars["id"]
	itemType := vars["type"]
	organizationId := r.URL.Query().Get("organizationId")

	log.Printf("[PermanentDelete] Received request: type=%s, id=%s, organizationId=%s, user=%s", itemType, itemId, organizationId, claims.Username)

	if organizationId == "" {
		log.Printf("[PermanentDelete] Organization ID missing in query parameters")
		http.Error(w, "Organization ID is required", http.StatusBadRequest)
		return
	}

	// Verify user has access to the organization
	var authorized bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM auth.organization_members om
            JOIN auth.users u ON u.id = om.user_id
            WHERE u.email = $1 AND om.organization_id = $2
        )
    `, claims.Username, organizationId).Scan(&authorized)
	if err != nil {
		log.Printf("[PermanentDelete] Error checking organization membership: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	if !authorized {
		log.Printf("[PermanentDelete] User %s is not authorized for organization %s", claims.Username, organizationId)
		http.Error(w, "Access denied to organization", http.StatusForbidden)
		return
	}
	log.Printf("[PermanentDelete] User %s is authorized for organization %s", claims.Username, organizationId)

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		log.Printf("[PermanentDelete] Failed to start transaction: %v", err)
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	if itemType == "folder" {
		log.Printf("[PermanentDelete] Processing permanent deletion for folder id=%s", itemId)
		// Delete all documents in the folder tree from blob storage
		rows, err := tx.Query(`
            WITH RECURSIVE folder_tree AS (
                SELECT id FROM rdm.folders WHERE id = $1
                UNION ALL
                SELECT f.id FROM rdm.folders f
                INNER JOIN folder_tree ft ON f.parent_id = ft.id
            )
            SELECT d.id, d.file_path 
            FROM rdm.documents d
            JOIN folder_tree ft ON d.folder_id = ft.id
            WHERE d.deleted_at IS NOT NULL
        `, itemId)
		if err != nil {
			log.Printf("[PermanentDelete] Failed to query documents for folder %s: %v", itemId, err)
			http.Error(w, "Failed to get documents", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		// Initialize blob client
		client, containerName, err := getBlobClient(organizationId)
		if err != nil {
			log.Printf("[PermanentDelete] Failed to initialize blob storage client: %v", err)
			http.Error(w, "Failed to initialize storage", http.StatusInternalServerError)
			return
		}

		// Loop over each document in the folder tree and delete its blobs
		for rows.Next() {
			var docId, blobUrl string
			if err := rows.Scan(&docId, &blobUrl); err != nil {
				log.Printf("[PermanentDelete] Error scanning document row: %v", err)
				continue
			}
			log.Printf("[PermanentDelete] Attempting to delete blob(s) for document id=%s, blobUrl=%s", docId, blobUrl)
			if err := deleteDocumentBlobs(client, containerName, docId, blobUrl); err != nil {
				log.Printf("[PermanentDelete] Error deleting blobs for document %s: %v", docId, err)
			} else {
				log.Printf("[PermanentDelete] Successfully deleted blobs for document %s", docId)
			}
		}
		if err = rows.Err(); err != nil {
			log.Printf("[PermanentDelete] Row iteration error: %v", err)
		}

		// Permanently delete the folder and its children
		log.Printf("[PermanentDelete] Attempting to permanently delete folder and its subtree for folder id=%s", itemId)
		res, err := tx.Exec(`
            WITH RECURSIVE folder_tree AS (
                SELECT id FROM rdm.folders WHERE id = $1
                UNION ALL
                SELECT f.id FROM rdm.folders f
                INNER JOIN folder_tree ft ON f.parent_id = ft.id
            )
            DELETE FROM rdm.folders WHERE id IN (SELECT id FROM folder_tree)
        `, itemId)
		if err != nil {
			log.Printf("[PermanentDelete] Failed to delete folder: %v", err)
			http.Error(w, "Failed to delete folder", http.StatusInternalServerError)
			return
		}
		affected, _ := res.RowsAffected()
		log.Printf("[PermanentDelete] Deleted %d folder rows", affected)
	} else {
		log.Printf("[PermanentDelete] Processing permanent deletion for document id=%s", itemId)
		// Delete document blob
		var blobUrl string
		err := tx.QueryRow(
			"SELECT file_path FROM rdm.documents WHERE id = $1",
			itemId,
		).Scan(&blobUrl)
		if err != nil {
			log.Printf("[PermanentDelete] Failed to get document blob URL for document %s: %v", itemId, err)
			http.Error(w, "Failed to get document", http.StatusInternalServerError)
			return
		}
		log.Printf("[PermanentDelete] Retrieved blob URL for document %s: %s", itemId, blobUrl)
		client, containerName, err := getBlobClient(organizationId)
		if err != nil {
			log.Printf("[PermanentDelete] Failed to initialize blob storage client: %v", err)
			http.Error(w, "Failed to initialize storage", http.StatusInternalServerError)
			return
		}
		if err := deleteDocumentBlobs(client, containerName, itemId, blobUrl); err != nil {
			log.Printf("[PermanentDelete] Error deleting blobs for document %s: %v", itemId, err)
		} else {
			log.Printf("[PermanentDelete] Successfully deleted blobs for document %s", itemId)
		}

		// Permanently delete the document
		log.Printf("[PermanentDelete] Attempting to permanently delete document record id=%s", itemId)
		res, err := tx.Exec("DELETE FROM rdm.documents WHERE id = $1", itemId)
		if err != nil {
			log.Printf("[PermanentDelete] Failed to delete document record for id=%s: %v", itemId, err)
			http.Error(w, "Failed to delete document", http.StatusInternalServerError)
			return
		}
		affected, _ := res.RowsAffected()
		log.Printf("[PermanentDelete] Deleted %d document row(s)", affected)
	}

	if err = tx.Commit(); err != nil {
		log.Printf("[PermanentDelete] Failed to commit transaction: %v", err)
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	log.Printf("[PermanentDelete] Permanent deletion succeeded for %s id=%s", itemType, itemId)
	w.WriteHeader(http.StatusOK)
}

func getBlobClient(organizationID string) (*azblob.Client, string, error) {
	var storageAccount, storageKey string

	if os.Getenv("ENVIRONMENT") == "production" {
		storageAccount = os.Getenv("AZURE_STORAGE_ACCOUNT")
		storageKey = os.Getenv("AZURE_STORAGE_KEY")
	} else {
		config, err := loadConfigIfDev()
		if err != nil {
			return nil, "", err
		}
		storageAccount = config.Azure.StorageAccount
		storageKey = config.Azure.StorageKey
	}

	cred, err := azblob.NewSharedKeyCredential(storageAccount, storageKey)
	if err != nil {
		return nil, "", err
	}

	// Use the desired naming convention: "org-{organizationID}"
	containerName := fmt.Sprintf("org-%s", organizationID)
	serviceURL := fmt.Sprintf("https://%s.blob.core.windows.net", storageAccount)

	client, err := azblob.NewClientWithSharedKeyCredential(serviceURL, cred, nil)
	if err != nil {
		return nil, "", err
	}

	return client, containerName, nil
}

// Handler for getting all pages
func handleGetPages(w http.ResponseWriter, r *http.Request) {
	organizationId := r.URL.Query().Get("organizationId")
	if organizationId == "" {
		http.Error(w, "Organization ID is required", http.StatusBadRequest)
		return
	}

	claims := r.Context().Value(claimsKey).(*Claims)

	// Verify user has access to the organization
	var authorized bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM auth.organization_members om
            JOIN auth.users u ON u.id = om.user_id
            WHERE u.email = $1 AND om.organization_id = $2
        )
    `, claims.Username, organizationId).Scan(&authorized)

	if err != nil || !authorized {
		http.Error(w, "Access denied to organization", http.StatusForbidden)
		return
	}

	rows, err := db.Query(`
        SELECT 
            pc.id, 
            pc.parent_id,
            pc.title,
            COALESCE(pc.content, '') as content,
            pc.status,
            cb.email as created_by,
            ub.email as updated_by,
            db.email as deleted_by,
            pc.created_at,
            pc.updated_at,
            pc.deleted_at
        FROM pages.pages_content pc
        LEFT JOIN auth.users cb ON pc.created_by = cb.id
        LEFT JOIN auth.users ub ON pc.updated_by = ub.id
        LEFT JOIN auth.users db ON pc.deleted_by = db.id
        WHERE pc.organization_id = $1
        AND pc.deleted_at IS NULL
        ORDER BY pc.created_at DESC
    `, organizationId)

	if err != nil {
		log.Printf("Error fetching pages: %v", err)
		http.Error(w, "Failed to fetch pages", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var pages []map[string]interface{}
	for rows.Next() {
		var page struct {
			ID        string
			ParentID  sql.NullString
			Title     string
			Content   string // Changed from sql.NullString since we use COALESCE
			Status    string
			CreatedBy string
			UpdatedBy string
			DeletedBy sql.NullString
			CreatedAt time.Time
			UpdatedAt time.Time
			DeletedAt sql.NullTime
		}

		if err := rows.Scan(
			&page.ID,
			&page.ParentID,
			&page.Title,
			&page.Content,
			&page.Status,
			&page.CreatedBy,
			&page.UpdatedBy,
			&page.DeletedBy,
			&page.CreatedAt,
			&page.UpdatedAt,
			&page.DeletedAt,
		); err != nil {
			log.Printf("Error scanning page row: %v", err)
			continue
		}

		pageMap := map[string]interface{}{
			"id":        page.ID,
			"parentId":  page.ParentID.String,
			"title":     page.Title,
			"content":   page.Content,
			"status":    page.Status,
			"createdBy": page.CreatedBy,
			"updatedBy": page.UpdatedBy,
			"deletedBy": page.DeletedBy.String,
			"createdAt": page.CreatedAt,
			"updatedAt": page.UpdatedAt,
			"deletedAt": page.DeletedAt.Time,
		}

		pages = append(pages, pageMap)
	}

	log.Printf("Returning %d pages", len(pages)) // Add logging
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pages)
}

// Handler for creating a new page
func handleCreatePage(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(claimsKey).(*Claims)

	var req struct {
		Title          string  `json:"title"`
		ParentID       *string `json:"parentId"`
		OrganizationID string  `json:"organizationId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Verify user has access to the organization
	var authorized bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM auth.organization_members om
            JOIN auth.users u ON u.id = om.user_id
            WHERE u.email = $1 AND om.organization_id = $2
        )
    `, claims.Username, req.OrganizationID).Scan(&authorized)

	if err != nil || !authorized {
		http.Error(w, "Unauthorized access to organization", http.StatusForbidden)
		return
	}

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Get user ID
	var userId string
	err = tx.QueryRow(
		"SELECT id FROM auth.users WHERE email = $1",
		claims.Username,
	).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Create the page
	var pageId string
	var createdAt, updatedAt time.Time
	err = db.QueryRow(`
        INSERT INTO pages.pages_content (
            title,
            parent_id,
            organization_id,
            content,
            status,
            created_by,
            updated_by
        ) VALUES ($1, $2, $3, '', 'active', $4, $4)
        RETURNING id, created_at, updated_at
    `, req.Title, req.ParentID, req.OrganizationID, userId).Scan(&pageId, &createdAt, &updatedAt)

	if err != nil {
		log.Printf("Error creating page: %v", err)
		http.Error(w, "Failed to create page", http.StatusInternalServerError)
		return
	}

	// Return all the page fields
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":        pageId,
		"title":     req.Title,
		"parentId":  req.ParentID,
		"content":   "",
		"status":    "active",
		"createdBy": claims.Username,
		"updatedBy": claims.Username,
		"createdAt": createdAt,
		"updatedAt": updatedAt,
	})
}

// Handler for updating a page
func handleUpdatePage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pageId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	var req struct {
		Content        string `json:"content"`
		OrganizationID string `json:"organizationId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Get user ID
	var userId string
	err = tx.QueryRow(
		"SELECT id FROM auth.users WHERE email = $1",
		claims.Username,
	).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Verify user has access and update the page
	result, err := tx.Exec(`
        UPDATE pages.pages_content 
        SET 
            content = $1,
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        AND organization_id = $4
        AND EXISTS (
            SELECT 1 
            FROM auth.organization_members om
            WHERE om.organization_id = $4
            AND om.user_id = $2
        )
    `, req.Content, userId, pageId, req.OrganizationID)

	if err != nil {
		http.Error(w, "Failed to update page", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Page not found or access denied", http.StatusNotFound)
		return
	}

	// Create version record
	_, err = tx.Exec(`
        INSERT INTO pages.pages_versions (
            page_id,
            version,
            content,
            created_by
        ) SELECT 
            id,
            COALESCE((
                SELECT MAX(version) + 1
                FROM pages.pages_versions
                WHERE page_id = $1
            ), 1),
            $2,
            $3
        FROM pages.pages_content
        WHERE id = $1
    `, pageId, req.Content, userId)

	if err != nil {
		http.Error(w, "Failed to create version record", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// Handler for deleting a page
func handleDeletePage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pageId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	organizationId := r.URL.Query().Get("organizationId")
	if organizationId == "" {
		http.Error(w, "Organization ID is required", http.StatusBadRequest)
		return
	}

	// Get user ID
	var userId string
	err := db.QueryRow(
		"SELECT id FROM auth.users WHERE email = $1",
		claims.Username,
	).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	result, err := db.Exec(`
        UPDATE pages.pages_content 
        SET 
            deleted_at = CURRENT_TIMESTAMP,
            deleted_by = $1
        WHERE id = $2
        AND organization_id = $3
        AND EXISTS (
            SELECT 1 
            FROM auth.organization_members om
            WHERE om.organization_id = $3
            AND om.user_id = $1
        )
    `, userId, pageId, organizationId)

	if err != nil {
		http.Error(w, "Failed to delete page", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Page not found or access denied", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// Handler for renaming a page
func handleRenamePage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pageId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	var req struct {
		Title          string `json:"title"`
		OrganizationID string `json:"organizationId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get user ID
	var userId string
	err := db.QueryRow(
		"SELECT id FROM auth.users WHERE email = $1",
		claims.Username,
	).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	result, err := db.Exec(`
        UPDATE pages.pages_content 
        SET 
            title = $1,
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        AND organization_id = $4
        AND EXISTS (
            SELECT 1 
            FROM auth.organization_members om
            WHERE om.organization_id = $4
            AND om.user_id = $2
        )
    `, req.Title, userId, pageId, req.OrganizationID)

	if err != nil {
		http.Error(w, "Failed to rename page", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Page not found or access denied", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// Handler for moving a page
func handleMovePage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pageId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	var req struct {
		NewParentID    *string `json:"newParentId"`
		OrganizationID string  `json:"organizationId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get user ID
	var userId string
	err := db.QueryRow(
		"SELECT id FROM auth.users WHERE email = $1",
		claims.Username,
	).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	result, err := db.Exec(`
        UPDATE pages.pages_content 
        SET 
            parent_id = $1,
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        AND organization_id = $4
        AND EXISTS (
            SELECT 1 
            FROM auth.organization_members om
            WHERE om.organization_id = $4
            AND om.user_id = $2
        )
    `, req.NewParentID, userId, pageId, req.OrganizationID)

	if err != nil {
		http.Error(w, "Failed to move page", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Page not found or access denied", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func getBlobSasUrl(containerName string, blobName string) (string, error) {
	var storageAccount, storageKey string

	if os.Getenv("ENVIRONMENT") == "production" {
		storageAccount = os.Getenv("AZURE_STORAGE_ACCOUNT_NAME")
		storageKey = os.Getenv("AZURE_STORAGE_ACCOUNT_KEY")
	} else {
		config, err := loadConfigIfDev()
		if err != nil {
			return "", err
		}
		storageAccount = config.Azure.StorageAccount
		storageKey = config.Azure.StorageKey
	}

	credential, err := azblob.NewSharedKeyCredential(storageAccount, storageKey)
	if err != nil {
		return "", err
	}

	permissions := (&sas.BlobPermissions{Read: true}).String()

	// Set expiry time to 1 hour from now
	signatureValues := sas.BlobSignatureValues{
		Protocol:      sas.ProtocolHTTPS,
		StartTime:     time.Now().UTC(),
		ExpiryTime:    time.Now().UTC().Add(1 * time.Hour),
		ContainerName: containerName,
		BlobName:      blobName,
		Permissions:   permissions,
	}

	sasQueryParams, err := signatureValues.SignWithSharedKey(credential)
	if err != nil {
		return "", err
	}

	blobUrl := fmt.Sprintf("https://%s.blob.core.windows.net/%s/%s?%s",
		storageAccount,
		containerName,
		blobName,
		sasQueryParams.Encode())

	return blobUrl, nil
}

func getUserIdFromEmail(email string) (string, error) {
	var userId string
	err := db.QueryRow("SELECT id FROM auth.users WHERE email = $1", email).Scan(&userId)
	return userId, err
}

func handleUploadPageImage(w http.ResponseWriter, r *http.Request) {
	log.Printf("Starting image upload handler")

	claims := r.Context().Value(claimsKey).(*Claims)
	pageId := r.FormValue("pageId")
	organizationId := r.FormValue("organizationId")

	log.Printf("Received upload request - pageId: %s, organizationId: %s", pageId, organizationId)

	if organizationId == "" {
		log.Printf("Organization ID is missing")
		http.Error(w, "Organization ID is required", http.StatusBadRequest)
		return
	}

	// Get user ID
	var userId string
	err := db.QueryRow(
		"SELECT id FROM auth.users WHERE email = $1",
		claims.Username,
	).Scan(&userId)
	if err != nil {
		log.Printf("Error getting user ID: %v", err)
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Verify user has access to the organization
	var authorized bool
	err = db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM auth.organization_members om
            JOIN auth.users u ON u.id = om.user_id
            WHERE u.email = $1 AND om.organization_id = $2
        )
    `, claims.Username, organizationId).Scan(&authorized)

	if err != nil || !authorized {
		log.Printf("User %s not authorized for organization %s", claims.Username, organizationId)
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	file, header, err := r.FormFile("image")
	if err != nil {
		log.Printf("Error getting file: %v", err)
		http.Error(w, "Failed to get image file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Upload to blob storage
	client, containerName, err := getBlobClient(organizationId)
	if err != nil {
		log.Printf("Error getting blob client: %v", err)
		http.Error(w, "Failed to initialize storage", http.StatusInternalServerError)
		return
	}

	// Generate blob name/path
	timestamp := time.Now().Format("2006/01/02")
	blobName := fmt.Sprintf("pages/images/%s/%s/%s_%s",
		pageId,
		timestamp,
		uuid.New().String(),
		header.Filename,
	)

	containerClient := client.ServiceClient().NewContainerClient(containerName)
	blobClient := containerClient.NewBlockBlobClient(blobName)

	// Ensure container exists
	_, err = containerClient.Create(context.Background(), nil)
	if err != nil {
		var stgErr *azcore.ResponseError
		if errors.As(err, &stgErr) && stgErr.ErrorCode == "ContainerAlreadyExists" {
			// Ignore this error
		} else {
			log.Printf("Error creating container: %v", err)
			http.Error(w, "Failed to ensure container exists", http.StatusInternalServerError)
			return
		}
	}

	// Upload the file
	_, err = blobClient.Upload(context.Background(), file, nil)
	if err != nil {
		log.Printf("Error uploading to blob storage: %v", err)
		http.Error(w, "Failed to upload image", http.StatusInternalServerError)
		return
	}

	// Generate SAS URL
	sasUrl, err := getBlobSasUrl(containerName, blobName)
	if err != nil {
		log.Printf("Error generating SAS URL: %v", err)
		http.Error(w, "Failed to generate access URL", http.StatusInternalServerError)
		return
	}

	// Store the blob path (without SAS token) in the database
	blobPath := fmt.Sprintf("/%s/%s", containerName, blobName)

	var imageId string
	err = tx.QueryRow(`
        INSERT INTO pages.pages_images (
            page_id,
            file_name,
            file_path,
            file_size,
            mime_type,
            created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
    `,
		pageId,
		header.Filename,
		blobPath,
		header.Size,
		header.Header.Get("Content-Type"),
		userId,
	).Scan(&imageId)

	if err != nil {
		log.Printf("Error inserting into database: %v", err)
		http.Error(w, "Failed to save image metadata", http.StatusInternalServerError)
		return
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully uploaded image: id=%s, path=%s", imageId, blobPath)

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":   imageId,
		"url":  sasUrl,
		"name": header.Filename,
	})
}

func getStorageCredentials() (string, string, error) {
	var storageAccount, storageKey string
	if os.Getenv("ENVIRONMENT") == "production" {
		storageAccount = os.Getenv("AZURE_STORAGE_ACCOUNT_NAME")
		storageKey = os.Getenv("AZURE_STORAGE_ACCOUNT_KEY")
	} else {
		config, err := loadConfigIfDev()
		if err != nil {
			return "", "", err
		}
		storageAccount = config.Azure.StorageAccount
		storageKey = config.Azure.StorageKey
	}
	if storageAccount == "" || storageKey == "" {
		return "", "", fmt.Errorf("missing storage account or key")
	}
	return storageAccount, storageKey, nil
}

func handleRefreshImageSasTokens(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(claimsKey).(*Claims)
	pageId := r.URL.Query().Get("pageId")
	organizationId := r.URL.Query().Get("organizationId")

	log.Printf("[RefreshImageSasTokens] Received request: pageId=%s, organizationId=%s", pageId, organizationId)

	// Verify access
	var authorized bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM auth.organization_members om
            JOIN auth.users u ON u.id = om.user_id
            WHERE u.email = $1 AND om.organization_id = $2
        )
    `, claims.Username, organizationId).Scan(&authorized)
	if err != nil {
		log.Printf("[RefreshImageSasTokens] Error checking access: %v", err)
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}
	if !authorized {
		log.Printf("[RefreshImageSasTokens] Unauthorized access for user %s to organization %s", claims.Username, organizationId)
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}
	log.Printf("[RefreshImageSasTokens] Access verified for user %s", claims.Username)

	// Get the blob client and container name using your helper.
	client, containerName, err := getBlobClient(organizationId)
	if err != nil {
		log.Printf("[RefreshImageSasTokens] Error in getBlobClient: %v", err)
		http.Error(w, "Failed to initialize storage", http.StatusInternalServerError)
		return
	}
	log.Printf("[RefreshImageSasTokens] Blob client obtained; containerName=%s", containerName)

	// Retrieve storage credentials.
	accountName, storageKey, err := getStorageCredentials()
	if err != nil {
		log.Printf("[RefreshImageSasTokens] Error retrieving storage credentials: %v", err)
		http.Error(w, "Storage credentials not configured", http.StatusInternalServerError)
		return
	}
	log.Printf("[RefreshImageSasTokens] Retrieved storage credentials; accountName=%s", accountName)

	// Query the images for the page.
	rows, err := db.Query(`
        SELECT id, file_path
        FROM pages.pages_images
        WHERE page_id = $1
        AND deleted_at IS NULL
    `, pageId)
	if err != nil {
		log.Printf("[RefreshImageSasTokens] Error querying images: %v", err)
		http.Error(w, "Failed to fetch images", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var images []map[string]interface{}
	for rows.Next() {
		var id, filePath string
		if err := rows.Scan(&id, &filePath); err != nil {
			log.Printf("[RefreshImageSasTokens] Error scanning row: %v", err)
			continue
		}
		log.Printf("[RefreshImageSasTokens] Processing image id=%s, filePath=%s", id, filePath)

		// Extract blob name from file path.
		parsedURL, err := url.Parse(filePath)
		if err != nil {
			log.Printf("[RefreshImageSasTokens] Error parsing URL (%s): %v", filePath, err)
			continue
		}
		blobName := strings.TrimPrefix(parsedURL.Path, fmt.Sprintf("/%s/", containerName))
		log.Printf("[RefreshImageSasTokens] Extracted blobName=%s", blobName)

		// Create a blob client for this blob.
		containerClient := client.ServiceClient().NewContainerClient(containerName)
		blobClient := containerClient.NewBlockBlobClient(blobName)

		// Create a shared key credential.
		cred, err := azblob.NewSharedKeyCredential(accountName, storageKey)
		if err != nil {
			log.Printf("[RefreshImageSasTokens] Error creating shared key credential: %v", err)
			continue
		}

		now := time.Now().UTC()
		expiryTime := now.Add(24 * time.Hour)
		// Permissions.String() must be called on a pointer.
		permissions := (&sas.BlobPermissions{Read: true}).String()
		log.Printf("[RefreshImageSasTokens] Using permissions: %s", permissions)

		sasValues := sas.BlobSignatureValues{
			Protocol:      sas.ProtocolHTTPS,
			StartTime:     now,
			ExpiryTime:    expiryTime,
			ContainerName: containerName,
			BlobName:      blobName,
			Permissions:   permissions,
			Version:       "2020-12-06",
		}
		log.Printf("[RefreshImageSasTokens] Built SAS values: %+v", sasValues)

		// Generate SAS query parameters.
		queryParams, err := sasValues.SignWithSharedKey(cred)
		if err != nil {
			log.Printf("[RefreshImageSasTokens] Error signing SAS values for blob %s: %v", blobName, err)
			continue
		}

		// Build the SAS URL.
		sasURL := fmt.Sprintf("%s?%s", blobClient.URL(), queryParams.Encode())
		log.Printf("[RefreshImageSasTokens] Generated SAS URL for image id=%s: %s", id, sasURL)

		images = append(images, map[string]interface{}{
			"id":  id,
			"url": sasURL,
		})
	}

	if err := rows.Err(); err != nil {
		log.Printf("[RefreshImageSasTokens] Error iterating rows: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"images": images,
	}); err != nil {
		log.Printf("[RefreshImageSasTokens] Error encoding JSON response: %v", err)
	}
}

func handleDeletePageImage(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(claimsKey).(*Claims)
	vars := mux.Vars(r)
	imageId := vars["id"]
	organizationId := r.URL.Query().Get("organizationId")

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Get user ID
	userId, err := getUserIdFromEmail(claims.Username)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Get image details and verify access
	var filePath string
	err = tx.QueryRow(`
        SELECT i.file_path
        FROM pages.pages_images i
        JOIN pages.pages_content p ON i.page_id = p.id
        JOIN auth.organization_members om ON p.organization_id = om.organization_id
        JOIN auth.users u ON om.user_id = u.id
        WHERE i.id = $1 
        AND p.organization_id = $2
        AND u.email = $3
        AND i.deleted_at IS NULL
    `, imageId, organizationId, claims.Username).Scan(&filePath)

	if err == sql.ErrNoRows {
		http.Error(w, "Image not found or access denied", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Initialize Azure client
	client, containerName, err := getBlobClient(organizationId)
	if err != nil {
		http.Error(w, "Failed to initialize storage", http.StatusInternalServerError)
		return
	}

	// Parse the blob URL to get the blob name
	parsedUrl, err := url.Parse(filePath)
	if err != nil {
		http.Error(w, "Invalid blob URL", http.StatusInternalServerError)
		return
	}
	blobName := strings.TrimPrefix(parsedUrl.Path, fmt.Sprintf("/%s/", containerName))

	// Delete the blob
	blobClient := client.ServiceClient().NewContainerClient(containerName).NewBlockBlobClient(blobName)
	_, err = blobClient.Delete(context.Background(), nil)
	if err != nil {
		log.Printf("Warning: Failed to delete blob: %v", err)
	}

	// Mark the image as deleted in the database
	_, err = tx.Exec(`
        UPDATE pages.pages_images 
        SET deleted_at = CURRENT_TIMESTAMP,
            deleted_by = $1
        WHERE id = $2
    `, userId, imageId)

	if err != nil {
		http.Error(w, "Failed to update image record", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func handleListTemplates(w http.ResponseWriter, r *http.Request) {
	organizationId := r.URL.Query().Get("organizationId")
	if organizationId == "" {
		http.Error(w, "Organization ID is required", http.StatusBadRequest)
		return
	}

	claims := r.Context().Value(claimsKey).(*Claims)

	// Verify user has access to the organization
	var authorized bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM auth.organization_members om
            JOIN auth.users u ON u.id = om.user_id
            WHERE u.email = $1 AND om.organization_id = $2
        )
    `, claims.Username, organizationId).Scan(&authorized)

	if err != nil || !authorized {
		http.Error(w, "Access denied to organization", http.StatusForbidden)
		return
	}

	// Query both system and custom templates
	rows, err := db.Query(`
        SELECT 
            pc.id, 
            pc.parent_id,
            pc.title,
            COALESCE(pc.content, '') as content,
            pc.status,
            pc.template_type,
            cb.email as created_by,
            ub.email as updated_by,
            pc.created_at,
            pc.updated_at
        FROM pages.pages_content pc
        LEFT JOIN auth.users cb ON pc.created_by = cb.id
        LEFT JOIN auth.users ub ON pc.updated_by = ub.id
        WHERE (
            (pc.organization_id = $1 AND pc.status = 'template') -- Custom templates
            OR 
            (pc.status = 'system_template') -- System templates
        )
        AND pc.deleted_at IS NULL
        ORDER BY 
            CASE 
                WHEN pc.status = 'system_template' THEN 1 
                ELSE 2 
            END,
            pc.created_at DESC
    `, organizationId)

	if err != nil {
		log.Printf("Error fetching templates: %v", err)
		http.Error(w, "Failed to fetch templates", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var templates []map[string]interface{}
	for rows.Next() {
		var template struct {
			ID           string
			ParentID     sql.NullString
			Title        string
			Content      string
			Status       string
			TemplateType string
			CreatedBy    string
			UpdatedBy    string
			CreatedAt    time.Time
			UpdatedAt    time.Time
		}

		if err := rows.Scan(
			&template.ID,
			&template.ParentID,
			&template.Title,
			&template.Content,
			&template.Status,
			&template.TemplateType,
			&template.CreatedBy,
			&template.UpdatedBy,
			&template.CreatedAt,
			&template.UpdatedAt,
		); err != nil {
			log.Printf("Error scanning template row: %v", err)
			continue
		}

		templateMap := map[string]interface{}{
			"id":           template.ID,
			"parentId":     template.ParentID.String,
			"title":        template.Title,
			"content":      template.Content,
			"status":       template.Status,
			"templateType": template.TemplateType,
			"createdBy":    template.CreatedBy,
			"updatedBy":    template.UpdatedBy,
			"createdAt":    template.CreatedAt,
			"updatedAt":    template.UpdatedAt,
			"isSystem":     template.Status == "system_template",
		}

		templates = append(templates, templateMap)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating template rows: %v", err)
		http.Error(w, "Error processing templates", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"templates": templates,
	})
}

func handleRdmRefreshToken(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	refreshTokenString := r.Header.Get("X-Refresh-Token")
	if refreshTokenString == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(AuthResponse{
			Success: false,
			Message: "No refresh token provided",
		})
		return
	}

	claims, err := validateToken(refreshTokenString)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(AuthResponse{
			Success: false,
			Message: "Invalid refresh token",
		})
		return
	}

	// Generate new access token
	accessClaims := &Claims{
		Username: claims.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	// Generate new refresh token
	refreshClaims := &Claims{
		Username: claims.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(JWT_SECRET_KEY))
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(AuthResponse{
			Success: false,
			Message: "Failed to generate new access token",
		})
		return
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err = refreshToken.SignedString([]byte(JWT_SECRET_KEY))
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(AuthResponse{
			Success: false,
			Message: "Failed to generate new refresh token",
		})
		return
	}

	json.NewEncoder(w).Encode(AuthResponse{
		Success:      true,
		Message:      "RDM tokens refreshed successfully",
		Token:        accessTokenString,
		RefreshToken: refreshTokenString,
	})
}

func main() {
	r := mux.NewRouter()
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://portal.localhost:5173", "https://primith.com", "https://portal.primith.com"},
		AllowedMethods:   []string{"DELETE", "GET", "POST", "PUT", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization", "X-Refresh-Token"},
		AllowCredentials: true,
	})

	// Initialize database connection
	var config Config
	var err error

	if os.Getenv("ENVIRONMENT") != "production" {
		config, err = loadConfigIfDev()
		if err != nil {
			log.Fatal("Failed to load config:", err)
		}
	}

	if err := initDB(config); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()

	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Welcome to the Primith API")
	}).Methods("GET")

	// Public routes
	r.HandleFunc("/api/contact", handleContact).Methods("POST")
	r.HandleFunc("/register", register).Methods("POST")
	r.HandleFunc("/login", login).Methods("POST")
	r.HandleFunc("/logout", logout).Methods("POST")
	r.HandleFunc("/refresh", refreshAccessToken).Methods("POST")

	// Protected routes
	r.HandleFunc("/protected", authMiddleware(protected)).Methods("GET")
	r.HandleFunc("/me", authMiddleware(handleGetCurrentUser)).Methods("GET")

	// Admin check
	r.HandleFunc("/admin/check", authMiddleware(handleAdminCheck)).Methods("GET")

	// Admin User routes
	r.HandleFunc("/admin/users", superAdminMiddleware(handleListUsers)).Methods("GET")
	r.HandleFunc("/admin/users", superAdminMiddleware(handleCreateUser)).Methods("POST")
	r.HandleFunc("/admin/users/{id}", superAdminMiddleware(handleGetUser)).Methods("GET")
	r.HandleFunc("/admin/users/{id}", superAdminMiddleware(handleUpdateUser)).Methods("PUT")
	r.HandleFunc("/admin/users/{id}", superAdminMiddleware(handleDeleteUser)).Methods("DELETE")

	// Admin Organization routes
	r.HandleFunc("/admin/organizations", superAdminMiddleware(handleListOrganizations)).Methods("GET")
	r.HandleFunc("/admin/organizations", superAdminMiddleware(handleCreateOrganization)).Methods("POST")
	r.HandleFunc("/admin/organizations/{id}", superAdminMiddleware(handleGetOrganization)).Methods("GET")
	r.HandleFunc("/admin/organizations/{id}", superAdminMiddleware(handleUpdateOrganization)).Methods("PUT")
	r.HandleFunc("/admin/organizations/{id}", superAdminMiddleware(handleDeleteOrganization)).Methods("DELETE")

	// Admin Role routes
	r.HandleFunc("/admin/roles", superAdminMiddleware(handleListRoles)).Methods("GET")
	r.HandleFunc("/admin/roles", superAdminMiddleware(handleCreateRole)).Methods("POST")
	r.HandleFunc("/admin/roles/{id}", superAdminMiddleware(handleGetRole)).Methods("GET")
	r.HandleFunc("/admin/roles/{id}", superAdminMiddleware(handleUpdateRole)).Methods("PUT")
	r.HandleFunc("/admin/roles/{id}", superAdminMiddleware(handleDeleteRole)).Methods("DELETE")

	// Admin Service routes
	r.HandleFunc("/admin/services", superAdminMiddleware(handleListServices)).Methods("GET")
	r.HandleFunc("/admin/services", superAdminMiddleware(handleCreateService)).Methods("POST")
	r.HandleFunc("/admin/services/{id}", superAdminMiddleware(handleGetService)).Methods("GET")
	r.HandleFunc("/admin/services/{id}", superAdminMiddleware(handleUpdateService)).Methods("PUT")
	r.HandleFunc("/admin/services/{id}", superAdminMiddleware(handleDeleteService)).Methods("DELETE")
	r.HandleFunc("/admin/services/{serviceId}/organizations", superAdminMiddleware(handleAssignOrganizationToService)).Methods("POST")
	r.HandleFunc("/admin/services/{serviceId}/organizations/{orgId}", superAdminMiddleware(handleRemoveOrganizationFromService)).Methods("DELETE")

	// Open AI Chat
	r.HandleFunc("/api/chat", authMiddleware(handleChat)).Methods("POST")

	// RDM API
	r.HandleFunc("/rdm/access", authMiddleware(handleCheckRdmAccess)).Methods("GET")
	r.HandleFunc("/rdm/organizations", authMiddleware(handleGetUserRdmOrganizations)).Methods("GET")
	r.HandleFunc("/rdm/refresh", handleRdmRefreshToken).Methods("POST")
	r.HandleFunc("/folders", authMiddleware(handleCreateFolder)).Methods("POST")
	r.HandleFunc("/folders", authMiddleware(handleGetFolders)).Methods("GET")
	r.HandleFunc("/folders/{id}", authMiddleware(handleDeleteFolder)).Methods("DELETE")
	r.HandleFunc("/folders/{id}", authMiddleware(handleRenameFolder)).Methods("PUT")
	r.HandleFunc("/folders/{id}/move", authMiddleware(handleMoveFolderStructure)).Methods("POST")
	r.HandleFunc("/documents", authMiddleware(handleGetDocuments)).Methods("GET")
	r.HandleFunc("/documents/upload", authMiddleware(handleUploadDocument)).Methods("POST")
	r.HandleFunc("/documents/{id}/download", authMiddleware(handleDownloadDocument)).Methods("GET")
	r.HandleFunc("/documents/{id}", authMiddleware(handleUpdateDocument)).Methods("PUT")
	r.HandleFunc("/documents/{id}", authMiddleware(handleDeleteDocument)).Methods("DELETE")
	r.HandleFunc("/documents/{id}/trash", authMiddleware(handleTrashDocument)).Methods("PUT")
	r.HandleFunc("/documents/{id}/restore", authMiddleware(handleRestoreDocument)).Methods("PUT")
	r.HandleFunc("/documents/{id}/rename", authMiddleware(handleRenameDocument)).Methods("PUT")
	r.HandleFunc("/folders/{id}/trash", authMiddleware(handleTrashFolder)).Methods("PUT")
	r.HandleFunc("/folders/{id}/restore", authMiddleware(handleRestoreFolder)).Methods("PUT")
	r.HandleFunc("/trash", authMiddleware(handleGetTrashItems)).Methods("GET")
	r.HandleFunc("/trash/{type}/{id}", authMiddleware(handlePermanentDelete)).Methods("DELETE")

	// Pages routes
	r.HandleFunc("/pages", authMiddleware(handleGetPages)).Methods("GET")
	r.HandleFunc("/pages", authMiddleware(handleCreatePage)).Methods("POST")
	r.HandleFunc("/pages/{id}", authMiddleware(handleUpdatePage)).Methods("PUT")
	r.HandleFunc("/pages/{id}", authMiddleware(handleDeletePage)).Methods("DELETE")
	r.HandleFunc("/pages/{id}/rename", authMiddleware(handleRenamePage)).Methods("PUT")
	r.HandleFunc("/pages/{id}/move", authMiddleware(handleMovePage)).Methods("POST")
	r.HandleFunc("/pages/images/upload", authMiddleware(handleUploadPageImage)).Methods("POST")
	r.HandleFunc("/pages/images/refresh-tokens", authMiddleware(handleRefreshImageSasTokens)).Methods("GET")
	r.HandleFunc("/pages/images/{id}", authMiddleware(handleDeletePageImage)).Methods("DELETE")
	r.HandleFunc("/pages/templates", authMiddleware(handleListTemplates)).Methods("GET")

	// Protected routes
	r.HandleFunc("/protected", authMiddleware(protected)).Methods("GET")

	handler := c.Handler(r)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default to 8080 if not set
	}
	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}
