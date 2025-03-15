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
	"strconv"
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
	"github.com/jung-kurt/gofpdf"
	"github.com/lib/pq"
	"github.com/rs/cors"
	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/net/html"
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
	ID        string `json:"id"`
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

type Project struct {
	ID             uuid.UUID  `json:"id"`
	Name           string     `json:"name"`
	Description    string     `json:"description"`
	OrganizationID uuid.UUID  `json:"organizationId"`
	Status         string     `json:"status"`
	StartDate      *time.Time `json:"startDate"`
	EndDate        *time.Time `json:"endDate"`
	CreatedBy      uuid.UUID  `json:"createdBy"`
	UpdatedBy      *uuid.UUID `json:"updatedBy"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

type ProjectMember struct {
	ID        uuid.UUID `json:"id"`
	ProjectID uuid.UUID `json:"projectId"`
	UserID    uuid.UUID `json:"userId"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
	CreatedBy uuid.UUID `json:"createdBy"`
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
	ID            string         `json:"id"`
	FirstName     string         `json:"firstName"`
	LastName      string         `json:"lastName"`
	Username      string         `json:"username"`
	Password      string         `json:"password"`
	Email         string         `json:"email"`
	IsActive      bool           `json:"isActive,omitempty"`
	Organizations []Organization `json:"organizations,omitempty"`
	Roles         []Role         `json:"roles,omitempty"`
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

type ProjectVariable struct {
	ID          string    `json:"id"`
	ProjectID   string    `json:"projectId"`
	Key         string    `json:"key"`
	Value       string    `json:"value"`
	Description string    `json:"description,omitempty"`
	CreatedBy   string    `json:"createdBy"`
	UpdatedAt   time.Time `json:"updatedAt"`
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
		connStr = fmt.Sprintf("user=%s dbname=%s password=%s host=%s sslmode=%s",
			os.Getenv("DB_USER"),
			os.Getenv("DB_NAME"),
			os.Getenv("DB_PASSWORD"),
			os.Getenv("DB_HOST"),
			os.Getenv("DB_SSLMODE"))
	} else {
		connStr = fmt.Sprintf("user=%s dbname=%s password=%s host=%s sslmode=%s",
			config.Database.User,
			config.Database.DBName,
			config.Database.Password,
			config.Database.Host,
			config.Database.SSLMode)
	}

	// Open the connection with specific pool settings
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		return err
	}

	// Set connection pool parameters
	db.SetMaxOpenConns(25)                 // Maximum number of open connections
	db.SetMaxIdleConns(10)                 // Maximum number of idle connections
	db.SetConnMaxLifetime(5 * time.Minute) // Maximum lifetime of a connection
	db.SetConnMaxIdleTime(1 * time.Minute) // Maximum idle time of a connection

	// Verify connection
	err = db.Ping()
	if err != nil {
		return err
	}

	log.Printf("Successfully connected to database with pool settings")
	return nil
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
		User: UserData{
			ID:        userID,
			FirstName: userData.FirstName,
			LastName:  userData.LastName,
			Email:     userData.Email,
		},
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

	// Validate UUID format
	if _, err := uuid.Parse(userID); err != nil {
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}

	// Execute the stored procedure
	_, err := db.Exec(`CALL auth.delete_user($1)`, userID)
	if err != nil {
		pqErr, ok := err.(*pq.Error)
		if ok {
			switch pqErr.Message {
			case "User with ID " + userID + " not found":
				http.Error(w, "User not found", http.StatusNotFound)
			case "Cannot delete the last super_admin user":
				http.Error(w, "Cannot delete the last super admin", http.StatusForbidden)
			default:
				http.Error(w, "Failed to delete user: "+err.Error(), http.StatusInternalServerError)
			}
		} else {
			http.Error(w, "Failed to delete user: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(Response{
		Success: true,
		Message: "User deleted successfully",
	})
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
	log.Printf("Handling create user request")

	// Log the raw request body
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Failed to read request body: %v", err)
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	log.Printf("Raw request body: %s", string(bodyBytes))
	// Restore the body for decoding
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		log.Printf("Failed to decode request body: %v", err)
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}
	log.Printf("Decoded user: %+v", user)

	// Basic input validation
	if user.Email == "" || user.Password == "" || user.FirstName == "" || user.LastName == "" {
		http.Error(w, "All fields are required", http.StatusBadRequest)
		return
	}
	if len(user.Email) > 255 || len(user.FirstName) > 100 || len(user.LastName) > 100 {
		http.Error(w, "Input exceeds maximum length", http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Failed to hash password: %v", err)
		http.Error(w, "Failed to hash password: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Prepare organization and role ID arrays
	orgIDs := make([]string, 0, len(user.Organizations))
	for i, org := range user.Organizations {
		if org.ID != "" && isValidUUID(org.ID) {
			orgIDs = append(orgIDs, org.ID)
			log.Printf("Added organization ID: %s", org.ID)
		} else {
			log.Printf("Skipping invalid organization at index %d: ID=%s", i, org.ID)
		}
	}
	log.Printf("Final Organization IDs before pq.Array: %v", orgIDs)

	roleIDs := make([]string, 0, len(user.Roles))
	for i, role := range user.Roles {
		if role.ID != "" && isValidUUID(role.ID) {
			roleIDs = append(roleIDs, role.ID)
			log.Printf("Added role ID: %s, OrganizationID: %v", role.ID, role.OrganizationID)
			// Fetch organization_id from database if not provided or invalid
			if role.OrganizationID == nil || (role.OrganizationID != nil && (*role.OrganizationID == "" || !isValidUUID(*role.OrganizationID))) {
				var orgID string
				err := db.QueryRow(`
						SELECT organization_id
						FROM auth.roles
						WHERE id = $1
					`, role.ID).Scan(&orgID)
				if err != nil {
					if err == sql.ErrNoRows {
						log.Printf("Role %s not found in database", role.ID)
					} else {
						log.Printf("Error querying organization_id for role %s: %v", role.ID, err)
					}
					if len(orgIDs) > 0 {
						role.OrganizationID = &orgIDs[0]
						log.Printf("Using fallback orgID %s for role %s due to query error", orgIDs[0], role.ID)
					} else {
						log.Printf("No valid organization_id or fallback available for role %s", role.ID)
						http.Error(w, "No valid organization_id for role "+role.ID, http.StatusBadRequest)
						return
					}
				} else if orgID != "" && isValidUUID(orgID) {
					role.OrganizationID = &orgID
					log.Printf("Fetched organization_id %s for role %s from database", orgID, role.ID)
				} else {
					log.Printf("Invalid or empty organization_id %s fetched for role %s", orgID, role.ID)
					if len(orgIDs) > 0 {
						role.OrganizationID = &orgIDs[0]
						log.Printf("Using fallback orgID %s for role %s", orgIDs[0], role.ID)
					} else {
						log.Printf("No valid organization_id or fallback available for role %s", role.ID)
						http.Error(w, "No valid organization_id for role "+role.ID, http.StatusBadRequest)
						return
					}
				}
			} else {
				log.Printf("Using provided organization_id %s for role %s", *role.OrganizationID, role.ID)
			}
			log.Printf("Validated role %s", role.ID)
		} else {
			log.Printf("Skipping invalid role at index %d: ID=%s", i, role.ID)
		}
	}
	log.Printf("Final Role IDs before pq.Array: %v", roleIDs)

	orgArray := pq.Array(orgIDs)
	roleArray := pq.Array(roleIDs)
	log.Printf("PostgreSQL Organization Array: %v", orgArray)
	log.Printf("PostgreSQL Role Array: %v", roleArray)

	if len(orgIDs) == 0 && len(roleIDs) > 0 {
		log.Printf("No organization IDs provided for user with roles")
		http.Error(w, "Organization ID is required when assigning roles", http.StatusBadRequest)
		return
	}

	var userID string
	err = db.QueryRow(`
			SELECT auth.create_user($1, $2, $3, $4, $5, $6)
		`, user.Email, string(hashedPassword), user.FirstName, user.LastName,
		pq.Array(orgIDs), pq.Array(roleIDs)).Scan(&userID)
	if err != nil {
		log.Printf("Failed to create user in DB: %v", err)
		http.Error(w, "Failed to create user: "+err.Error(), http.StatusInternalServerError)
		return
	}
	user.ID = userID
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "User created successfully",
		"user":    user,
	}); err != nil {
		log.Printf("Failed to encode response: %v", err)
		http.Error(w, "Failed to encode response: "+err.Error(), http.StatusInternalServerError)
		return
	}
}

// Helper function remains unchanged
func isValidUUID(u string) bool {
	_, err := uuid.Parse(u)
	return err == nil
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
	projectId := r.URL.Query().Get("projectId")

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

	// Base query
	query := `
		SELECT 
			d.id, d.name, d.file_type, d.file_size, d.version, d.updated_at, d.folder_id, d.organization_id, d.project_id
		FROM rdm.documents d
		WHERE d.organization_id = $1
		AND d.deleted_at IS NULL
		`
	args := []interface{}{organizationId}
	paramCount := 1

	// Add folder filter if provided
	if folderId != "" {
		paramCount++
		query += fmt.Sprintf(" AND d.folder_id = $%d", paramCount)
		args = append(args, folderId)
	}

	// Add project filter if provided
	if projectId != "" {
		paramCount++
		query += fmt.Sprintf(" AND d.project_id = $%d", paramCount)
		args = append(args, projectId)
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
		ProjectID      *string   `json:"projectId"` // Added to handle NULL values
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
			&doc.ProjectID, // Scan the project_id
		); err != nil {
			log.Printf("Error scanning document row: %v", err)
			continue
		}
		documents = append(documents, doc)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(documents); err != nil {
		log.Printf("Error encoding documents: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
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

		// Loop over each document in the folder tree and delete its blobs and artifacts
		for rows.Next() {
			var docId, blobUrl string
			if err := rows.Scan(&docId, &blobUrl); err != nil {
				log.Printf("[PermanentDelete] Error scanning document row: %v", err)
				continue
			}
			log.Printf("[PermanentDelete] Processing document id=%s", docId)

			// Delete associated project_artifacts
			_, err = tx.Exec(`
					DELETE FROM rdm.project_artifacts
					WHERE document_id = $1
				`, docId)
			if err != nil {
				log.Printf("[PermanentDelete] Failed to delete project_artifacts for document %s: %v", docId, err)
				http.Error(w, "Failed to delete associated artifacts", http.StatusInternalServerError)
				return
			}

			// Delete blobs
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
	} else if itemType == "document" {
		log.Printf("[PermanentDelete] Processing permanent deletion for document id=%s", itemId)
		// Get document blob URL
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

		// Initialize blob client
		client, containerName, err := getBlobClient(organizationId)
		if err != nil {
			log.Printf("[PermanentDelete] Failed to initialize blob storage client: %v", err)
			http.Error(w, "Failed to initialize storage", http.StatusInternalServerError)
			return
		}

		// Delete associated project_artifacts
		_, err = tx.Exec(`
				DELETE FROM rdm.project_artifacts
				WHERE document_id = $1
			`, itemId)
		if err != nil {
			log.Printf("[PermanentDelete] Failed to delete project_artifacts for document %s: %v", itemId, err)
			http.Error(w, "Failed to delete associated artifacts", http.StatusInternalServerError)
			return
		}
		log.Printf("[PermanentDelete] Deleted project_artifacts for document %s", itemId)

		// Delete blobs
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
	} else {
		log.Printf("[PermanentDelete] Invalid item type: %s", itemType)
		http.Error(w, "Invalid item type", http.StatusBadRequest)
		return
	}

	if err = tx.Commit(); err != nil {
		log.Printf("[PermanentDelete] Failed to commit transaction: %v", err)
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	log.Printf("[PermanentDelete] Permanent deletion succeeded for %s id=%s", itemType, itemId)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(Response{
		Success: true,
		Message: fmt.Sprintf("%s permanently deleted", itemType),
	})
}

func getBlobClient(organizationID string) (*azblob.Client, string, error) {
	var storageAccount, storageKey string

	if os.Getenv("ENVIRONMENT") == "production" {
		storageAccount = os.Getenv("AZURE_STORAGE_ACCOUNT_NAME")
		storageKey = os.Getenv("AZURE_STORAGE_ACCOUNT_KEY")
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
	log.Printf("[handleGetPages] Starting request handling")

	organizationId := r.URL.Query().Get("organizationId")
	projectId := r.URL.Query().Get("projectId")
	if organizationId == "" {
		log.Printf("[handleGetPages] Error: Missing organizationId in request")
		http.Error(w, "Organization ID is required", http.StatusBadRequest)
		return
	}
	log.Printf("[handleGetPages] Requested organizationId: %s", organizationId)
	if projectId != "" {
		log.Printf("[handleGetPages] Filtering by projectId: %s", projectId)
	}

	claims := r.Context().Value(claimsKey).(*Claims)
	log.Printf("[handleGetPages] User email from claims: %s", claims.Username)

	// Log authorization headers
	authHeader := r.Header.Get("Authorization")
	log.Printf("[handleGetPages] Authorization header present: %v", authHeader != "")

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
		log.Printf("[handleGetPages] Database error checking authorization: %v", err)
		http.Error(w, "Error checking access", http.StatusInternalServerError)
		return
	}

	if !authorized {
		log.Printf("[handleGetPages] Access denied for user %s to organization %s",
			claims.Username, organizationId)

		// Log additional debugging info
		var userExists bool
		err := db.QueryRow(`
				SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = $1)
			`, claims.Username).Scan(&userExists)
		if err != nil {
			log.Printf("[handleGetPages] Error checking user existence: %v", err)
		} else {
			log.Printf("[handleGetPages] User exists in database: %v", userExists)
		}

		var orgExists bool
		err = db.QueryRow(`
				SELECT EXISTS(SELECT 1 FROM auth.organizations WHERE id = $1)
			`, organizationId).Scan(&orgExists)
		if err != nil {
			log.Printf("[handleGetPages] Error checking organization existence: %v", err)
		} else {
			log.Printf("[handleGetPages] Organization exists in database: %v", orgExists)
		}

		// Log membership entries
		rows, err := db.Query(`
				SELECT om.user_id, u.email, om.organization_id 
				FROM auth.organization_members om
				JOIN auth.users u ON om.user_id = u.id
				WHERE organization_id = $1
			`, organizationId)
		if err != nil {
			log.Printf("[handleGetPages] Error querying org members: %v", err)
		} else {
			defer rows.Close()
			log.Printf("[handleGetPages] Current members of organization %s:", organizationId)
			for rows.Next() {
				var userId, email, orgId string
				if err := rows.Scan(&userId, &email, &orgId); err != nil {
					log.Printf("[handleGetPages] Error scanning member row: %v", err)
					continue
				}
				log.Printf("[handleGetPages] Member: userId=%s, email=%s, orgId=%s",
					userId, email, orgId)
			}
		}

		http.Error(w, "Access denied to organization", http.StatusForbidden)
		return
	}

	log.Printf("[handleGetPages] Access authorized for user %s to organization %s",
		claims.Username, organizationId)

	// Build query with parameters
	query := `
			SELECT 
				pc.id, 
				pc.parent_id,
				pc.name,
				COALESCE(pc.content, '') as content,
				pc.status,
				pc.project_id,
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
			AND pc.type = 'page'
		`
	args := []interface{}{organizationId}
	paramCount := 1

	// Add project filter if provided
	if projectId != "" {
		paramCount++
		query += fmt.Sprintf(" AND pc.project_id = $%d", paramCount)
		args = append(args, projectId)
		log.Printf("[handleGetPages] Added project filter to query")
	}

	query += " ORDER BY pc.created_at DESC"

	// Execute the query with the appropriate arguments
	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("[handleGetPages] Error fetching pages: %v", err)
		http.Error(w, "Failed to fetch pages", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var pages []map[string]interface{}
	for rows.Next() {
		var page struct {
			ID        string
			ParentID  sql.NullString
			Name      string
			Content   string
			Status    string
			ProjectID sql.NullString
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
			&page.Name,
			&page.Content,
			&page.Status,
			&page.ProjectID,
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
			"name":      page.Name,
			"content":   page.Content,
			"status":    page.Status,
			"projectId": page.ProjectID.String,
			"createdBy": page.CreatedBy,
			"updatedBy": page.UpdatedBy,
			"deletedBy": page.DeletedBy.String,
			"createdAt": page.CreatedAt,
			"updatedAt": page.UpdatedAt,
			"deletedAt": page.DeletedAt.Time,
		}

		pages = append(pages, pageMap)
	}

	log.Printf("[handleGetPages] Returning %d pages (projectId filter: %s)", len(pages), projectId)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pages)
}

// Associate document with project
func handleAssociateDocumentWithProject(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	documentId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Define request struct with optional fields
	var req struct {
		ProjectID   *string `json:"projectId"`
		Name        *string `json:"name"`
		Type        *string `json:"type"`
		Status      *string `json:"status"`
		Description *string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Invalid request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		log.Printf("Failed to start transaction: %v", err)
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Get document's organization and current project
	var orgId string
	var currentProjectId sql.NullString
	err = tx.QueryRow(`
			SELECT organization_id, project_id
			FROM rdm.documents
			WHERE id = $1 AND deleted_at IS NULL
		`, documentId).Scan(&orgId, &currentProjectId)
	if err == sql.ErrNoRows {
		log.Printf("Document %s not found", documentId)
		http.Error(w, "Document not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("Failed to fetch document: %v", err)
		http.Error(w, "Failed to fetch document", http.StatusInternalServerError)
		return
	}

	// Verify user has access to the organization
	var authorized bool
	err = tx.QueryRow(`
			SELECT EXISTS (
				SELECT 1 
				FROM auth.organization_members om
				JOIN auth.users u ON u.id = om.user_id
				WHERE u.email = $1 AND om.organization_id = $2
			)
		`, claims.Username, orgId).Scan(&authorized)
	if err != nil || !authorized {
		log.Printf("Access denied for user %s to organization %s: %v", claims.Username, orgId, err)
		http.Error(w, "Access denied to organization", http.StatusForbidden)
		return
	}

	// Get user ID
	var userId string
	err = tx.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		log.Printf("Failed to get user ID for %s: %v", claims.Username, err)
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Get the document's original name
	var docName string
	err = tx.QueryRow(`
			SELECT name
			FROM rdm.documents
			WHERE id = $1 AND deleted_at IS NULL
		`, documentId).Scan(&docName)
	if err != nil {
		log.Printf("Failed to fetch document name for %s: %v", documentId, err)
		http.Error(w, "Failed to fetch document name", http.StatusInternalServerError)
		return
	}

	if req.ProjectID != nil {
		// Linking to a project
		var projectOrgId string
		err = tx.QueryRow(`
				SELECT organization_id
				FROM rdm.projects
				WHERE id = $1
			`, *req.ProjectID).Scan(&projectOrgId)
		if err == sql.ErrNoRows {
			log.Printf("Project %s not found", *req.ProjectID)
			http.Error(w, "Project not found", http.StatusNotFound)
			return
		}
		if err != nil {
			log.Printf("Failed to verify project %s: %v", *req.ProjectID, err)
			http.Error(w, "Failed to verify project", http.StatusInternalServerError)
			return
		}
		if projectOrgId != orgId {
			log.Printf("Project %s does not belong to organization %s", *req.ProjectID, orgId)
			http.Error(w, "Project does not belong to the same organization", http.StatusForbidden)
			return
		}

		// Verify user is a member of the project
		var isMember bool
		err = tx.QueryRow(`
				SELECT EXISTS (
					SELECT 1 
					FROM rdm.project_members pm
					JOIN auth.users u ON pm.user_id = u.id
					WHERE pm.project_id = $1 AND u.email = $2
				)
			`, *req.ProjectID, claims.Username).Scan(&isMember)
		if err != nil || !isMember {
			log.Printf("User %s is not a member of project %s: %v", claims.Username, *req.ProjectID, err)
			http.Error(w, "User is not a member of the project", http.StatusForbidden)
			return
		}

		// Update document's project_id
		_, err = tx.Exec(`
				UPDATE rdm.documents 
				SET project_id = $1,
					updated_at = CURRENT_TIMESTAMP,
					updated_by = $2
				WHERE id = $3
			`, *req.ProjectID, userId, documentId)
		if err != nil {
			log.Printf("Failed to associate document %s with project %s: %v", documentId, *req.ProjectID, err)
			http.Error(w, "Failed to associate document with project", http.StatusInternalServerError)
			return
		}

		// Determine artifact name with extension preservation
		artifactName := docName
		if req.Name != nil && *req.Name != "" {
			// Get original extension (convert to lowercase for comparison)
			originalExt := ""
			if lastDotIndex := strings.LastIndex(docName, "."); lastDotIndex != -1 {
				originalExt = strings.ToLower(docName[lastDotIndex:])
			}

			// Check if proposed name already has an extension
			proposedName := *req.Name
			hasExtension := false

			if lastDotIndex := strings.LastIndex(proposedName, "."); lastDotIndex != -1 {
				proposedExt := strings.ToLower(proposedName[lastDotIndex:])
				// Check if the proposed extension matches a known file extension format
				if len(proposedExt) >= 2 && len(proposedExt) <= 5 {
					hasExtension = true

					// If the extensions don't match, replace with the original
					if originalExt != "" && proposedExt != originalExt {
						log.Printf("Extension mismatch: original=%s, proposed=%s. Using original extension.",
							originalExt, proposedExt)
						proposedName = proposedName[:lastDotIndex] + originalExt
					}
				}
			}

			// If the proposed name doesn't have a valid extension but original does, add it
			if !hasExtension && originalExt != "" {
				proposedName = proposedName + originalExt
				log.Printf("Added extension %s to artifact name: %s", originalExt, proposedName)
			}

			artifactName = proposedName
		}

		// Set artifact type and status with defaults
		artifactType := "document"
		if req.Type != nil && *req.Type != "" {
			artifactType = *req.Type
		}
		artifactStatus := "draft"
		if req.Status != nil && *req.Status != "" {
			artifactStatus = *req.Status
		}

		// Insert into project_artifacts with preserved extension
		_, err = tx.Exec(`
				INSERT INTO rdm.project_artifacts (
					project_id, name, type, status, document_id, description, created_by, updated_by
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
			`, *req.ProjectID, artifactName, artifactType, artifactStatus, documentId, req.Description, userId)
		if err != nil {
			log.Printf("Failed to create artifact for document %s in project %s: %v", documentId, *req.ProjectID, err)
			http.Error(w, "Failed to create artifact", http.StatusInternalServerError)
			return
		}
	} else {
		// Unlinking from a project
		_, err = tx.Exec(`
				UPDATE rdm.documents 
				SET project_id = NULL,
					updated_at = CURRENT_TIMESTAMP,
					updated_by = $1
				WHERE id = $2
			`, userId, documentId)
		if err != nil {
			log.Printf("Failed to unlink document %s from project: %v", documentId, err)
			http.Error(w, "Failed to unlink document from project", http.StatusInternalServerError)
			return
		}

		// Delete the corresponding artifact entry
		_, err = tx.Exec(`
				DELETE FROM rdm.project_artifacts
				WHERE document_id = $1
			`, documentId)
		if err != nil {
			log.Printf("Failed to remove artifact for document %s: %v", documentId, err)
			http.Error(w, "Failed to remove artifact association", http.StatusInternalServerError)
			return
		}
	}

	if err = tx.Commit(); err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	var message string
	if req.ProjectID != nil {
		message = fmt.Sprintf("Document associated with project %s", *req.ProjectID)
	} else {
		message = "Document unlinked from project"
	}
	json.NewEncoder(w).Encode(Response{Success: true, Message: message})
}

// Add this handler to your main.go file
func handleGetArtifactStatuses(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Verify user has access to the project
	var isMember bool
	err := db.QueryRow(`
	  SELECT EXISTS (
		SELECT 1 
		FROM rdm.project_members pm
		JOIN auth.users u ON pm.user_id = u.id
		WHERE pm.project_id = $1 AND u.email = $2
	  )
	`, projectId, claims.Username).Scan(&isMember)

	if err != nil {
		http.Error(w, "Failed to check project membership", http.StatusInternalServerError)
		return
	}

	if !isMember {
		http.Error(w, "Access denied to project artifact statuses", http.StatusForbidden)
		return
	}

	// Fetch all system statuses and any project-specific statuses
	rows, err := db.Query(`
	  SELECT id, name, color, description, is_default, is_system
	  FROM rdm.project_artifact_statuses
	  WHERE is_system = true 
	  OR project_id = $1
	  ORDER BY order_index ASC
	`, projectId)
	if err != nil {
		http.Error(w, "Failed to fetch artifact statuses", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var statuses []map[string]interface{}
	for rows.Next() {
		var status struct {
			ID          string
			Name        string
			Color       string
			Description sql.NullString
			IsDefault   bool
			IsSystem    bool
		}
		if err := rows.Scan(&status.ID, &status.Name, &status.Color,
			&status.Description, &status.IsDefault, &status.IsSystem); err != nil {
			continue
		}

		statuses = append(statuses, map[string]interface{}{
			"id":          status.ID,
			"name":        status.Name,
			"color":       status.Color,
			"description": status.Description.String,
			"is_default":  status.IsDefault,
			"is_system":   status.IsSystem,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(statuses)
}

func handleUpdateArtifact(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	artifactId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	log.Printf("[handleUpdateArtifact] Received update request for artifact %s by user %s", artifactId, claims.Username)

	var updateData struct {
		Name        string  `json:"name"`
		Type        string  `json:"type"`
		Status      string  `json:"status"`
		Description *string `json:"description"`
		DocumentId  *string `json:"documentId"`
		PageId      *string `json:"pageId"`
		AssignedTo  *string `json:"assignedTo"` // Add assignedTo field
	}
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		log.Printf("[handleUpdateArtifact] Invalid request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("[handleUpdateArtifact] Update data received: %+v", updateData)

	// Verify artifact exists and get project ID and related IDs
	var projectId string
	var documentId, pageId sql.NullString
	err := db.QueryRow(`
			SELECT project_id, document_id, page_id FROM rdm.project_artifacts WHERE id = $1
		`, artifactId).Scan(&projectId, &documentId, &pageId)
	if err == sql.ErrNoRows {
		log.Printf("[handleUpdateArtifact] Artifact %s not found - returning 404", artifactId)
		http.Error(w, "Artifact not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("[handleUpdateArtifact] Database error checking artifact: %v", err)
		http.Error(w, "Failed to check artifact", http.StatusInternalServerError)
		return
	}

	// Check if user is a super admin or a project member
	var isSuperAdmin bool
	err = db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 
				FROM auth.user_roles ur
				JOIN auth.roles r ON ur.role_id = r.id
				JOIN auth.users u ON ur.user_id = u.id
				WHERE u.email = $1 
				AND r.name = 'super_admin'
			)
		`, claims.Username).Scan(&isSuperAdmin)
	if err != nil {
		log.Printf("[handleUpdateArtifact] Database error checking super admin status: %v", err)
		http.Error(w, "Failed to check super admin status", http.StatusInternalServerError)
		return
	}

	var isMember bool
	err = db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 
				FROM rdm.project_members pm
				JOIN auth.users u ON pm.user_id = u.id
				WHERE pm.project_id = $1 AND u.email = $2
			)
		`, projectId, claims.Username).Scan(&isMember)
	if err != nil {
		log.Printf("[handleUpdateArtifact] Database error checking membership: %v", err)
		http.Error(w, "Failed to check project membership", http.StatusInternalServerError)
		return
	}

	if !isSuperAdmin && !isMember {
		log.Printf("[handleUpdateArtifact] Access denied for user %s to project %s (not super admin or member)", claims.Username, projectId)
		http.Error(w, "Access denied to update artifact", http.StatusForbidden)
		return
	}

	// Handle file extensions for document and image types
	if documentId.Valid && (updateData.Type == "document" || updateData.Type == "image") {
		var docName string
		err = db.QueryRow(`
				SELECT name FROM rdm.documents WHERE id = $1
			`, documentId.String).Scan(&docName)
		if err == nil {
			originalExt := ""
			if lastDotIndex := strings.LastIndex(docName, "."); lastDotIndex != -1 {
				originalExt = strings.ToLower(docName[lastDotIndex:])
			}
			if originalExt != "" && !strings.HasSuffix(strings.ToLower(updateData.Name), originalExt) {
				updateData.Name += originalExt
				log.Printf("[handleUpdateArtifact] Preserved extension %s for artifact name: %s", originalExt, updateData.Name)
			}
		}
	}

	// Start a transaction
	tx, err := db.Begin()
	if err != nil {
		log.Printf("[handleUpdateArtifact] Failed to start transaction: %v", err)
		http.Error(w, "Failed to update artifact", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback() // Rollback if not committed

	// Get user ID for updates
	var userId string
	err = tx.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		log.Printf("[handleUpdateArtifact] Failed to get user ID: %v", err)
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Parse assignedTo UUID if provided
	var assignedToUUID *string
	if updateData.AssignedTo != nil && *updateData.AssignedTo != "" {
		assignedToUUID = updateData.AssignedTo
	}

	// Update rdm.project_artifacts
	_, err = tx.Exec(`
			UPDATE rdm.project_artifacts
			SET name = $1, 
				status = $2, 
				description = $3, 
				document_id = $4,
				page_id = $5,
				assigned_to = $6,
				updated_at = CURRENT_TIMESTAMP,
				updated_by = $7
			WHERE id = $8
		`, updateData.Name, updateData.Status, updateData.Description,
		updateData.DocumentId, updateData.PageId, assignedToUUID,
		userId, artifactId)
	if err != nil {
		log.Printf("[handleUpdateArtifact] Failed to update project_artifacts: %v", err)
		http.Error(w, "Failed to update artifact", http.StatusInternalServerError)
		return
	}

	// If there's a document_id, update rdm.documents.name as well
	if documentId.Valid {
		result, err := tx.Exec(`
				UPDATE rdm.documents
				SET name = $1,
					updated_at = CURRENT_TIMESTAMP,
					updated_by = $2
				WHERE id = $3
			`, updateData.Name, userId, documentId.String)
		if err != nil {
			log.Printf("[handleUpdateArtifact] Failed to update documents: %v", err)
			http.Error(w, "Failed to update document", http.StatusInternalServerError)
			return
		}
		rowsAffected, err := result.RowsAffected()
		if err != nil || rowsAffected == 0 {
			log.Printf("[handleUpdateArtifact] No document rows affected or error: %v", err)
		} else {
			log.Printf("[handleUpdateArtifact] Updated document %s with name %s", documentId.String, updateData.Name)
		}
	}

	// If there's a page_id, update pages.pages_content as well
	if pageId.Valid {
		result, err := tx.Exec(`
				UPDATE pages.pages_content
				SET name = $1,
					updated_at = CURRENT_TIMESTAMP,
					updated_by = $2
				WHERE id = $3
			`, updateData.Name, userId, pageId.String)
		if err != nil {
			log.Printf("[handleUpdateArtifact] Failed to update page: %v", err)
			http.Error(w, "Failed to update page", http.StatusInternalServerError)
			return
		}
		rowsAffected, err := result.RowsAffected()
		if err != nil || rowsAffected == 0 {
			log.Printf("[handleUpdateArtifact] No page rows affected or error: %v", err)
		} else {
			log.Printf("[handleUpdateArtifact] Updated page %s with name %s", pageId.String, updateData.Name)
		}
	}

	// Add activity log entry
	_, err = tx.Exec(`
		INSERT INTO rdm.project_activity (
			project_id, user_id, activity_type, entity_type, entity_id,
			description, new_values
		) VALUES ($1, $2, 'update', 'artifact', $3, $4, $5)
	`, projectId, userId, artifactId,
		"Updated artifact: "+updateData.Name,
		json.RawMessage(fmt.Sprintf(`{"name":"%s","status":"%s"}`, updateData.Name, updateData.Status)))

	if err != nil {
		log.Printf("[handleUpdateArtifact] Failed to record activity: %v", err)
		// Continue even if activity logging fails
	}

	// Commit the transaction
	if err := tx.Commit(); err != nil {
		log.Printf("[handleUpdateArtifact] Failed to commit transaction: %v", err)
		http.Error(w, "Failed to update artifact", http.StatusInternalServerError)
		return
	}

	// Return updated artifact data
	w.Header().Set("Content-Type", "application/json")
	response := map[string]interface{}{
		"id":          artifactId,
		"name":        updateData.Name,
		"status":      updateData.Status,
		"description": updateData.Description,
		"projectId":   projectId,
		"success":     true,
		"message":     "Artifact updated successfully",
	}

	if documentId.Valid {
		response["documentId"] = documentId.String
	}
	if pageId.Valid {
		response["pageId"] = pageId.String
	}
	if assignedToUUID != nil {
		response["assignedTo"] = *assignedToUUID
	}

	json.NewEncoder(w).Encode(response)
}

func handleAssociatePageWithProject(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pageId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Define request struct with optional fields
	var req struct {
		ProjectID   *string `json:"projectId"`
		Name        *string `json:"name"`
		Type        *string `json:"type"`
		Status      *string `json:"status"`
		Description *string `json:"description"`
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

	// Get page's organization ID
	var orgId string
	err = tx.QueryRow(`
			SELECT organization_id
			FROM pages.pages_content
			WHERE id = $1 AND deleted_at IS NULL
		`, pageId).Scan(&orgId)
	if err == sql.ErrNoRows {
		http.Error(w, "Page not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Failed to fetch page", http.StatusInternalServerError)
		return
	}

	// Verify user has access to the organization
	var authorized bool
	err = tx.QueryRow(`
			SELECT EXISTS (
				SELECT 1 
				FROM auth.organization_members om
				JOIN auth.users u ON u.id = om.user_id
				WHERE u.email = $1 AND om.organization_id = $2
			)
		`, claims.Username, orgId).Scan(&authorized)
	if err != nil || !authorized {
		http.Error(w, "Access denied to organization", http.StatusForbidden)
		return
	}

	// Get user ID
	var userId string
	err = tx.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Get the page's name
	var pageName string
	err = tx.QueryRow(`
			SELECT name
			FROM pages.pages_content
			WHERE id = $1 AND deleted_at IS NULL
		`, pageId).Scan(&pageName)
	if err != nil {
		http.Error(w, "Failed to fetch page name", http.StatusInternalServerError)
		return
	}

	if req.ProjectID != nil {
		// Linking to a project - first verify project exists and user has access
		var projectOrgId string
		err = tx.QueryRow(`
			SELECT organization_id
			FROM rdm.projects
			WHERE id = $1
		`, *req.ProjectID).Scan(&projectOrgId)
		if err == sql.ErrNoRows {
			http.Error(w, "Project not found", http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, "Failed to verify project", http.StatusInternalServerError)
			return
		}
		if projectOrgId != orgId {
			http.Error(w, "Project does not belong to the same organization", http.StatusForbidden)
			return
		}

		// Verify user is a member of the project
		var isMember bool
		err = tx.QueryRow(`
			SELECT EXISTS (
				SELECT 1 
				FROM rdm.project_members pm
				JOIN auth.users u ON pm.user_id = u.id
				WHERE pm.project_id = $1 AND u.email = $2
			)
		`, *req.ProjectID, claims.Username).Scan(&isMember)
		if err != nil || !isMember {
			http.Error(w, "User is not a member of the project", http.StatusForbidden)
			return
		}

		// Update page's project_id
		_, err = tx.Exec(`
			UPDATE pages.pages_content 
			SET project_id = $1,
				updated_at = CURRENT_TIMESTAMP,
				updated_by = $2
			WHERE id = $3
		`, *req.ProjectID, userId, pageId)
		if err != nil {
			http.Error(w, "Failed to associate page with project", http.StatusInternalServerError)
			return
		}

		// Determine artifact name
		artifactName := pageName
		if req.Name != nil && *req.Name != "" {
			artifactName = *req.Name
		}

		// Set artifact type and status with defaults
		artifactType := "page"
		if req.Type != nil && *req.Type != "" {
			artifactType = *req.Type
		}
		artifactStatus := "draft"
		if req.Status != nil && *req.Status != "" {
			artifactStatus = *req.Status
		}

		// Insert into project_artifacts
		_, err = tx.Exec(`
			INSERT INTO rdm.project_artifacts (
				project_id, name, type, status, page_id, description, created_by, updated_by
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
		`, *req.ProjectID, artifactName, artifactType, artifactStatus, pageId, req.Description, userId)
		if err != nil {
			http.Error(w, "Failed to create artifact", http.StatusInternalServerError)
			return
		}
	} else {
		// Unlinking from a project
		_, err = tx.Exec(`
			UPDATE pages.pages_content 
			SET project_id = NULL,
				updated_at = CURRENT_TIMESTAMP,
				updated_by = $1
			WHERE id = $2
		`, userId, pageId)
		if err != nil {
			http.Error(w, "Failed to unlink page from project", http.StatusInternalServerError)
			return
		}

		// Delete the corresponding artifact entry
		_, err = tx.Exec(`
			DELETE FROM rdm.project_artifacts
			WHERE page_id = $1
		`, pageId)
		if err != nil {
			http.Error(w, "Failed to remove artifact association", http.StatusInternalServerError)
			return
		}
	}

	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	var message string
	if req.ProjectID != nil {
		message = fmt.Sprintf("Page associated with project %s", *req.ProjectID)
	} else {
		message = "Page unlinked from project"
	}
	json.NewEncoder(w).Encode(Response{Success: true, Message: message})
}

// Handler for creating a new page
func handleCreatePage(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(claimsKey).(*Claims)

	var req struct {
		Name           string  `json:"name"`
		ParentID       *string `json:"parentId"`
		Type           string  `json:"type"`
		OrganizationID string  `json:"organizationId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Printf("Received request: %+v", req)

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

	// Get user ID
	var userId string
	err = db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Handle ParentID
	var parentIDParam *string
	if req.ParentID != nil && *req.ParentID != "" {
		parentIDValue := *req.ParentID
		parentIDParam = &parentIDValue
		var parentExists bool
		err = db.QueryRow(`
				SELECT EXISTS (
					SELECT 1 FROM pages.pages_content 
					WHERE id = $1 AND organization_id = $2
				)
			`, parentIDParam, req.OrganizationID).Scan(&parentExists)
		if err != nil || !parentExists {
			http.Error(w, "Invalid parent ID", http.StatusBadRequest)
			return
		}
	} else {
		parentIDParam = nil
	}

	// Create the page/folder
	var id string
	var createdAt, updatedAt time.Time
	log.Printf("Inserting: name=%s, parent_id=%v, org_id=%s, type=%s, user_id=%s",
		req.Name, parentIDParam, req.OrganizationID, req.Type, userId)
	err = db.QueryRow(`
			INSERT INTO pages.pages_content (
				name,
				parent_id,
				organization_id,
				content,
				type,
				status,
				created_by,
				updated_by
			) VALUES ($1, $2, $3, '', $4, 'active', $5, $5)
			RETURNING id, created_at, updated_at
		`, req.Name, parentIDParam, req.OrganizationID, req.Type, userId).Scan(&id, &createdAt, &updatedAt)
	if err != nil {
		log.Printf("Database error: %v", err)
		http.Error(w, "Failed to create item", http.StatusInternalServerError)
		return
	}

	// Verify insertion
	var insertedParentID *string
	err = db.QueryRow("SELECT parent_id FROM pages.pages_content WHERE id = $1", id).Scan(&insertedParentID)
	if err != nil {
		log.Printf("Failed to verify parent_id: %v", err)
	} else {
		log.Printf("Inserted parent_id from DB: %v (expected: %v)", insertedParentID, parentIDParam)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":             id,
		"name":           req.Name,
		"parentId":       req.ParentID,
		"type":           req.Type,
		"content":        "",
		"status":         "active",
		"createdBy":      claims.Username,
		"updatedBy":      claims.Username,
		"createdAt":      createdAt,
		"updatedAt":      updatedAt,
		"organizationId": req.OrganizationID,
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

// Handler for renaming a page
func handleRenamePage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pageId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	var req struct {
		Name           string `json:"name"`
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
				name = $1,
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
		`, req.Name, userId, pageId, req.OrganizationID)

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

	rows, err := db.Query(`
			SELECT 
				pc.id, 
				pc.parent_id,
				pc.name,
				COALESCE(pc.content, '') as content,
				COALESCE(tc.label, '') as category, 
				COALESCE(pc.description, '') as description,
				pc.status,
				tc.code as template_type,
				cb.email as created_by,
				ub.email as updated_by,
				pc.created_at,
				pc.updated_at,
				EXISTS (
					SELECT 1 FROM pages.user_favorite_templates uft 
					WHERE uft.template_id = pc.id 
					AND uft.user_id = (SELECT id FROM auth.users WHERE email = $2)
				) as is_favorite
			FROM pages.pages_content pc
			LEFT JOIN auth.users cb ON pc.created_by = cb.id
			LEFT JOIN auth.users ub ON pc.updated_by = ub.id
			LEFT JOIN pages.template_categories tc ON pc.template_category_id = tc.id
			WHERE (
				(pc.organization_id = $1 AND pc.status = 'template') 
				OR 
				(pc.status = 'system_template')
			)
			AND pc.deleted_at IS NULL
			ORDER BY 
				CASE 
					WHEN pc.status = 'system_template' THEN 1 
					ELSE 2 
				END,
				pc.created_at DESC
		`, organizationId, claims.Username)

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
			Name         string
			Content      string
			Category     string
			Description  string
			Status       string
			TemplateType string
			CreatedBy    string
			UpdatedBy    string
			CreatedAt    time.Time
			UpdatedAt    time.Time
			IsFavorite   bool
		}

		if err := rows.Scan(
			&template.ID,
			&template.ParentID,
			&template.Name,
			&template.Content,
			&template.Category,
			&template.Description,
			&template.Status,
			&template.TemplateType,
			&template.CreatedBy,
			&template.UpdatedBy,
			&template.CreatedAt,
			&template.UpdatedAt,
			&template.IsFavorite,
		); err != nil {
			log.Printf("Error scanning template row: %v", err)
			continue
		}

		templateMap := map[string]interface{}{
			"id":           template.ID,
			"parentId":     template.ParentID.String,
			"name":         template.Name,
			"content":      template.Content,
			"category":     template.Category,
			"description":  template.Description,
			"status":       template.Status,
			"templateType": template.TemplateType,
			"createdBy":    template.CreatedBy,
			"updatedBy":    template.UpdatedBy,
			"createdAt":    template.CreatedAt,
			"updatedAt":    template.UpdatedAt,
			"isSystem":     template.Status == "system_template",
			"isFavorite":   template.IsFavorite,
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

func handleToggleFavoriteTemplate(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(claimsKey).(*Claims)
	vars := mux.Vars(r)
	templateId := vars["id"]

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

	// Check if template is already favorited
	var exists bool
	err = db.QueryRow(`
			SELECT EXISTS(
				SELECT 1 FROM pages.user_favorite_templates 
				WHERE user_id = $1 AND template_id = $2
			)
		`, userId, templateId).Scan(&exists)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if exists {
		// Remove favorite
		_, err = db.Exec(`
				DELETE FROM pages.user_favorite_templates 
				WHERE user_id = $1 AND template_id = $2
			`, userId, templateId)
	} else {
		// Add favorite
		_, err = db.Exec(`
				INSERT INTO pages.user_favorite_templates (user_id, template_id)
				VALUES ($1, $2)
			`, userId, templateId)
	}

	if err != nil {
		http.Error(w, "Failed to toggle favorite", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":    true,
		"isFavorite": !exists,
	})
}

func handleGetPagesFolders(w http.ResponseWriter, r *http.Request) {
	log.Printf("Starting handleGetPagesFolders")
	organizationId := r.URL.Query().Get("organizationId")
	log.Printf("Fetching folders for organizationId: %s", organizationId)

	rows, err := db.Query(`
			SELECT 
				pc.id, 
				pc.name,
				pc.parent_id,
				pc.organization_id,
				pc.created_at,
				pc.updated_at,
				pc.deleted_at,
				cb.email as created_by,
				ub.email as updated_by,
				db.email as deleted_by
			FROM pages.pages_content pc
			LEFT JOIN auth.users cb ON pc.created_by = cb.id
			LEFT JOIN auth.users ub ON pc.updated_by = ub.id
			LEFT JOIN auth.users db ON pc.deleted_by = db.id
			WHERE pc.organization_id = $1
			AND pc.type = 'folder'
			AND pc.deleted_at IS NULL
			ORDER BY pc.created_at DESC
		`, organizationId)

	if err != nil {
		log.Printf("Error in folder query: %v", err)
		http.Error(w, "Failed to fetch folders", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var folders []map[string]interface{}
	for rows.Next() {
		var folder struct {
			ID             string
			Name           string
			ParentID       sql.NullString
			OrganizationID string
			CreatedAt      time.Time
			UpdatedAt      time.Time
			DeletedAt      sql.NullTime
			CreatedBy      string
			UpdatedBy      sql.NullString
			DeletedBy      sql.NullString
		}

		err := rows.Scan(
			&folder.ID,
			&folder.Name,
			&folder.ParentID,
			&folder.OrganizationID,
			&folder.CreatedAt,
			&folder.UpdatedAt,
			&folder.DeletedAt,
			&folder.CreatedBy,
			&folder.UpdatedBy,
			&folder.DeletedBy,
		)
		if err != nil {
			log.Printf("Error scanning folder row: %v", err)
			continue
		}

		log.Printf("Found folder: ID=%s, Name=%s, ParentID=%v, CreatedBy=%s",
			folder.ID, folder.Name, folder.ParentID.String, folder.CreatedBy)

		folderMap := map[string]interface{}{
			"id":             folder.ID,
			"name":           folder.Name,
			"parentId":       folder.ParentID.String,
			"organizationId": folder.OrganizationID,
			"createdAt":      folder.CreatedAt,
			"updatedAt":      folder.UpdatedAt,
			"deletedAt":      folder.DeletedAt.Time,
			"createdBy":      folder.CreatedBy,
			"updatedBy":      folder.UpdatedBy.String,
			"deletedBy":      folder.DeletedBy.String,
		}
		folders = append(folders, folderMap)
	}

	log.Printf("Returning %d folders: %+v", len(folders), folders)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"folders": folders,
	})
}

func handleCreatePagesFolder(w http.ResponseWriter, r *http.Request) {
	log.Printf("Starting handleCreatePagesFolder")
	claims := r.Context().Value(claimsKey).(*Claims)

	var req struct {
		Name           string  `json:"name"`
		ParentID       *string `json:"parentId"`
		OrganizationID string  `json:"organizationId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Failed to decode request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Printf("Received create folder request: %+v", req)

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
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	// Get user ID
	var userId string
	err = db.QueryRow(
		"SELECT id FROM auth.users WHERE email = $1",
		claims.Username,
	).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Handle ParentID - ensure it's NULL if not provided
	var parentIDParam interface{}
	if req.ParentID != nil && *req.ParentID != "" {
		parentIDParam = *req.ParentID
	} else {
		parentIDParam = nil
	}

	// Create the folder in pages_content
	var folderID string
	err = db.QueryRow(`
			INSERT INTO pages.pages_content (
				name,
				parent_id,
				organization_id,
				type,
				status,
				created_by,
				updated_by
			) VALUES ($1, $2, $3, 'folder', 'active', $4, $4)
			RETURNING id
		`, req.Name, parentIDParam, req.OrganizationID, userId).Scan(&folderID)
	if err != nil {
		log.Printf("Error creating folder: %v", err)
		http.Error(w, "Failed to create folder", http.StatusInternalServerError)
		return
	}

	// Fetch the complete folder data
	var folder struct {
		ID        string
		Name      string
		ParentID  sql.NullString
		OrgID     string
		CreatedAt time.Time
		UpdatedAt time.Time
		CreatedBy string
		UpdatedBy string
	}
	err = db.QueryRow(`
			SELECT 
				pc.id,
				pc.name,
				pc.parent_id,
				pc.organization_id,
				pc.created_at,
				pc.updated_at,
				cb.email as created_by,
				ub.email as updated_by
			FROM pages.pages_content pc
			LEFT JOIN auth.users cb ON pc.created_by = cb.id
			LEFT JOIN auth.users ub ON pc.updated_by = ub.id
			WHERE pc.id = $1
		`, folderID).Scan(
		&folder.ID,
		&folder.Name,
		&folder.ParentID,
		&folder.OrgID,
		&folder.CreatedAt,
		&folder.UpdatedAt,
		&folder.CreatedBy,
		&folder.UpdatedBy,
	)
	if err != nil {
		log.Printf("Error fetching folder details: %v", err)
		http.Error(w, "Failed to fetch folder details", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":             folder.ID,
		"name":           folder.Name,
		"parentId":       folder.ParentID.String,
		"organizationId": folder.OrgID,
		"createdAt":      folder.CreatedAt,
		"updatedAt":      folder.UpdatedAt,
		"createdBy":      folder.CreatedBy,
		"updatedBy":      folder.UpdatedBy,
	})
}

func handleUpdatePagesFolder(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(claimsKey).(*Claims)
	vars := mux.Vars(r)
	folderID := vars["id"]

	var req struct {
		Name           string  `json:"name"`
		ParentID       *string `json:"parentId"`
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
			SET name = $1,
				parent_id = $2,
				updated_by = $3,
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $4
			AND organization_id = $5
			AND type = 'folder'
			AND EXISTS (
				SELECT 1 
				FROM auth.organization_members om
				WHERE om.organization_id = $5
				AND om.user_id = $3
			)
		`, req.Name, req.ParentID, userId, folderID, req.OrganizationID)
	if err != nil {
		http.Error(w, "Failed to update folder", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Folder not found or access denied", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func handleDeletePagesFolder(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(claimsKey).(*Claims)
	vars := mux.Vars(r)
	folderID := vars["id"]

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

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Soft delete the folder and all its descendants
	_, err = tx.Exec(`
			WITH RECURSIVE content_tree AS (
				SELECT id FROM pages.pages_content WHERE id = $1 AND type = 'folder'
				UNION ALL
				SELECT pc.id FROM pages.pages_content pc
				INNER JOIN content_tree ct ON pc.parent_id = ct.id
			)
			UPDATE pages.pages_content
			SET deleted_at = CURRENT_TIMESTAMP,
				deleted_by = $2
			WHERE id IN (SELECT id FROM content_tree)
		`, folderID, userId)
	if err != nil {
		http.Error(w, "Failed to delete folder and contents", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func handleCreateTemplate(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(claimsKey).(*Claims)

	var req struct {
		Name           string `json:"name"`
		Content        string `json:"content"`
		Description    string `json:"description"`
		CategoryId     int    `json:"categoryId"`
		OrganizationID string `json:"organizationId"`
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

	// Get user ID
	var userId string
	err = db.QueryRow(
		"SELECT id FROM auth.users WHERE email = $1",
		claims.Username,
	).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Create the template
	var templateId string
	var createdAt, updatedAt time.Time
	err = db.QueryRow(`
			INSERT INTO pages.pages_content (
				name,
				content,
				description,
				template_category_id,
				organization_id,
				status,
				created_by,
				updated_by
			) VALUES ($1, $2, $3, $4, $5, 'template', $6, $6)
			RETURNING id, created_at, updated_at
		`, req.Name, req.Content, req.Description, req.CategoryId, req.OrganizationID, userId).Scan(&templateId, &createdAt, &updatedAt)
	if err != nil {
		log.Printf("Error creating template: %v", err)
		http.Error(w, "Failed to create template", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":          templateId,
		"name":        req.Name,
		"content":     req.Content,
		"description": req.Description,
		"categoryId":  req.CategoryId,
		"status":      "template",
		"createdBy":   claims.Username,
		"updatedBy":   claims.Username,
		"createdAt":   createdAt,
		"updatedAt":   updatedAt,
	})
}

func handleDeletePage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pageId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	organizationId := r.URL.Query().Get("organizationId")
	if organizationId == "" {
		http.Error(w, "Organization ID is required", http.StatusBadRequest)
		return
	}

	var userId string
	err := db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Check if the page is a system template
	var status string
	err = db.QueryRow("SELECT status FROM pages.pages_content WHERE id = $1", pageId).Scan(&status)
	if err != nil {
		http.Error(w, "Failed to fetch page status", http.StatusInternalServerError)
		return
	}

	if status == "system_template" {
		isAdmin, err := isSuperAdmin(claims.Username)
		if err != nil || !isAdmin {
			http.Error(w, "Only super admins can delete system templates", http.StatusForbidden)
			return
		}
	}

	result, err := db.Exec(`
			UPDATE pages.pages_content 
			SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
			WHERE id = $2 AND organization_id = $3
			AND EXISTS (
				SELECT 1 FROM auth.organization_members om
				WHERE om.organization_id = $3 AND om.user_id = $1
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

func handleGetTemplateCategories(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, code, label, is_system FROM pages.template_categories ORDER BY id")
	if err != nil {
		http.Error(w, "Failed to fetch template categories", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var categories []TemplateCategory
	for rows.Next() {
		var cat TemplateCategory
		if err := rows.Scan(&cat.ID, &cat.Code, &cat.Label, &cat.IsSystem); err != nil {
			http.Error(w, "Error scanning categories", http.StatusInternalServerError)
			return
		}
		categories = append(categories, cat)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

type TemplateCategory struct {
	ID       int    `json:"id"`
	Code     string `json:"code"`
	Label    string `json:"label"`
	IsSystem bool   `json:"isSystem"`
}

func handleGetTemplate(w http.ResponseWriter, r *http.Request) {
	log.Printf("[handleGetTemplate] Starting request handling")
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	templateId := vars["id"]
	organizationId := r.URL.Query().Get("organizationId")
	if organizationId == "" {
		log.Printf("[handleGetTemplate] Error: Missing organizationId")
		http.Error(w, "Organization ID is required", http.StatusBadRequest)
		return
	}
	log.Printf("[handleGetTemplate] templateId: %s, organizationId: %s", templateId, organizationId)

	claims := r.Context().Value(claimsKey).(*Claims)
	log.Printf("[handleGetTemplate] User: %s", claims.Username)

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
		log.Printf("[handleGetTemplate] Error checking authorization: %v", err)
		http.Error(w, "Error checking access", http.StatusInternalServerError)
		return
	}
	if !authorized {
		log.Printf("[handleGetTemplate] Access denied for user %s to organization %s", claims.Username, organizationId)
		http.Error(w, "Access denied to organization", http.StatusForbidden)
		return
	}
	log.Printf("[handleGetTemplate] User authorized")

	// Fetch the template
	var template struct {
		ID           string
		ParentID     sql.NullString
		Name         string
		Content      string
		Category     string
		CategoryID   sql.NullInt64
		Description  string
		Status       string
		TemplateType string
		CreatedBy    string
		UpdatedBy    string
		CreatedAt    time.Time
		UpdatedAt    time.Time
		IsFavorite   bool
	}

	err = db.QueryRow(`
			SELECT 
				pc.id, 
				pc.parent_id,
				pc.name,
				COALESCE(pc.content, '') as content,
				COALESCE(tc.label, '') as category,
				pc.template_category_id,
				COALESCE(pc.description, '') as description,
				pc.status,
				tc.code as template_type,
				cb.email as created_by,
				pc.updated_by,
				pc.created_at,
				pc.updated_at,
				EXISTS (
					SELECT 1 FROM pages.user_favorite_templates uft 
					WHERE uft.template_id = pc.id 
					AND uft.user_id = (SELECT id FROM auth.users WHERE email = $2)
				) as is_favorite
			FROM pages.pages_content pc
			LEFT JOIN auth.users cb ON pc.created_by = cb.id
			LEFT JOIN auth.users ub ON pc.updated_by = ub.id
			LEFT JOIN pages.template_categories tc ON pc.template_category_id = tc.id
			WHERE pc.id = $1
			AND pc.organization_id = $3
			AND pc.deleted_at IS NULL
		`, templateId, claims.Username, organizationId).Scan(
		&template.ID,
		&template.ParentID,
		&template.Name,
		&template.Content,
		&template.Category,
		&template.CategoryID,
		&template.Description,
		&template.Status,
		&template.TemplateType,
		&template.CreatedBy,
		&template.UpdatedBy,
		&template.CreatedAt,
		&template.UpdatedAt,
		&template.IsFavorite,
	)

	if err == sql.ErrNoRows {
		log.Printf("[handleGetTemplate] Template %s not found", templateId)
		http.Error(w, "Template not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("[handleGetTemplate] Error fetching template: %v", err)
		http.Error(w, "Failed to fetch template", http.StatusInternalServerError)
		return
	}

	templateMap := map[string]interface{}{
		"id":           template.ID,
		"parentId":     template.ParentID.String,
		"name":         template.Name,
		"content":      template.Content,
		"category":     template.Category,
		"categoryId":   template.CategoryID.Int64,
		"description":  template.Description,
		"status":       template.Status,
		"templateType": template.TemplateType,
		"createdBy":    template.CreatedBy,
		"updatedBy":    template.UpdatedBy,
		"createdAt":    template.CreatedAt,
		"updatedAt":    template.UpdatedAt,
		"isSystem":     template.Status == "system_template",
		"isFavorite":   template.IsFavorite,
	}

	log.Printf("[handleGetTemplate] Returning template: %s", templateId)
	json.NewEncoder(w).Encode(templateMap)
}

func handleUpdateTemplate(w http.ResponseWriter, r *http.Request) {
	log.Printf("[handleUpdateTemplate] Starting request handling")
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	templateId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)
	log.Printf("[handleUpdateTemplate] templateId: %s, user: %s", templateId, claims.Username)

	var req struct {
		Name           string `json:"name"`
		Content        string `json:"content"`
		Description    string `json:"description"`
		CategoryId     int    `json:"categoryId"`
		OrganizationID string `json:"organizationId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[handleUpdateTemplate] Invalid request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Printf("[handleUpdateTemplate] Request data: %+v", req)

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		log.Printf("[handleUpdateTemplate] Failed to start transaction: %v", err)
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Get user ID
	var userId string
	err = tx.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		log.Printf("[handleUpdateTemplate] Failed to get user ID: %v", err)
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Verify access and update the template
	result, err := tx.Exec(`
			UPDATE pages.pages_content 
			SET 
				name = $1,
				content = $2,
				description = $3,
				template_category_id = $4,
				updated_by = $5,
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $6
			AND organization_id = $7
			AND status = 'template'
			AND EXISTS (
				SELECT 1 
				FROM auth.organization_members om
				WHERE om.organization_id = $7
				AND om.user_id = $5
			)
		`, req.Name, req.Content, req.Description, req.CategoryId, userId, templateId, req.OrganizationID)
	if err != nil {
		log.Printf("[handleUpdateTemplate] Error updating template: %v", err)
		http.Error(w, "Failed to update template", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		log.Printf("[handleUpdateTemplate] No rows affected or error: %v, rows: %d", err, rowsAffected)
		http.Error(w, "Template not found or access denied", http.StatusNotFound)
		return
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		log.Printf("[handleUpdateTemplate] Failed to commit transaction: %v", err)
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	log.Printf("[handleUpdateTemplate] Template %s updated successfully", templateId)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Template updated successfully",
	})
}

func handleGetProjectArtifacts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	claims := r.Context().Value(claimsKey).(*Claims)
	log.Printf("Fetching artifacts for projectId: %s, user: %s", projectId, claims.Username)

	var isMember bool
	err := db.QueryRow(`
            SELECT EXISTS (
                SELECT 1 
                FROM rdm.project_members pm
                JOIN auth.users u ON pm.user_id = u.id
                WHERE pm.project_id = $1 AND u.email = $2
            )
        `, projectId, claims.Username).Scan(&isMember)
	if err != nil {
		log.Printf("Error checking project membership: %v", err)
		http.Error(w, "Failed to check project membership", http.StatusInternalServerError)
		return
	}
	if !isMember {
		log.Printf("User %s is not a member of project %s", claims.Username, projectId)
		http.Error(w, "Access denied to project artifacts", http.StatusForbidden)
		return
	}
	log.Printf("User %s is a member of project %s", claims.Username, projectId)

	// Enhanced query to include user emails instead of IDs
	rows, err := db.Query(`
            SELECT 
                a.id, a.project_id, a.name, a.type, a.status, 
                a.assigned_to, 
                CASE WHEN a.assigned_to IS NOT NULL THEN 
                    (SELECT email FROM auth.users WHERE id = a.assigned_to) 
                ELSE NULL END as assigned_to_email,
                a.due_date, a.document_id, a.page_id, 
                a.created_by, 
                (SELECT email FROM auth.users WHERE id = a.created_by) as created_by_email,
                a.updated_by, 
                CASE WHEN a.updated_by IS NOT NULL THEN 
                    (SELECT email FROM auth.users WHERE id = a.updated_by) 
                ELSE NULL END as updated_by_email,
                a.created_at, a.updated_at,
                a.description
            FROM rdm.project_artifacts a
            WHERE a.project_id = $1
        `, projectId)
	if err != nil {
		log.Printf("Error fetching artifacts: %v", err)
		http.Error(w, "Failed to fetch artifacts", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	log.Printf("Successfully queried artifacts for project %s", projectId)

	var artifacts []map[string]interface{}
	for rows.Next() {
		var (
			id, projectID, createdBy                        uuid.UUID
			name, artifactType, status                      string
			description                                     sql.NullString // Change to sql.NullString
			assignedTo, updatedBy                           sql.NullString
			assignedToEmail, createdByEmail, updatedByEmail sql.NullString
			documentID, pageID                              sql.NullString
			dueDate                                         sql.NullTime
			createdAt, updatedAt                            time.Time
		)

		err := rows.Scan(
			&id, &projectID, &name, &artifactType, &status,
			&assignedTo, &assignedToEmail, &dueDate,
			&documentID, &pageID, &createdBy, &createdByEmail,
			&updatedBy, &updatedByEmail, &createdAt, &updatedAt,
			&description, // Now can handle NULL
		)
		if err != nil {
			log.Printf("Error scanning artifact row: %v", err)
			http.Error(w, "Failed to scan artifact", http.StatusInternalServerError)
			return
		}

		artifact := map[string]interface{}{
			"id":              id.String(),
			"projectId":       projectID.String(),
			"name":            name,
			"type":            artifactType,
			"status":          status,
			"assignedTo":      nullStringValue(assignedTo),
			"assignedToEmail": nullStringValue(assignedToEmail),
			"dueDate":         formatTimeValue(dueDate),
			"documentId":      nullStringValue(documentID),
			"pageId":          nullStringValue(pageID),
			"createdBy":       createdBy.String(),
			"createdByEmail":  nullStringValue(createdByEmail),
			"updatedBy":       nullStringValue(updatedBy),
			"updatedByEmail":  nullStringValue(updatedByEmail),
			"createdAt":       createdAt,
			"updatedAt":       updatedAt,
			"description":     nullStringValue(description), // Use the helper function
		}

		artifacts = append(artifacts, artifact)
	}
	log.Printf("Found %d artifacts for project %s", len(artifacts), projectId)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(artifacts); err != nil {
		log.Printf("Error encoding artifacts: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
	log.Printf("Successfully sent artifacts response for project %s", projectId)
}

// Helper function to format sql.NullTime values
func formatTimeValue(t sql.NullTime) interface{} {
	if t.Valid {
		return t.Time.Format("2006-01-02")
	}
	return nil
}

// Add handlers
func handleGetProjects(w http.ResponseWriter, r *http.Request) {
	organizationId := r.URL.Query().Get("organizationId")
	if organizationId == "" {
		http.Error(w, "Organization ID is required", http.StatusBadRequest)
		return
	}

	claims := r.Context().Value(claimsKey).(*Claims)

	rows, err := db.Query(`
			SELECT p.id, p.name, p.description, p.organization_id, 
				p.status, p.start_date, p.end_date,
				p.created_by, p.updated_by, p.created_at, p.updated_at
			FROM rdm.projects p
			JOIN auth.organization_members om ON p.organization_id = om.organization_id 
			JOIN auth.users u ON om.user_id = u.id
			WHERE p.organization_id = $1 AND u.email = $2
			ORDER BY p.created_at DESC
		`, organizationId, claims.Username)

	if err != nil {
		http.Error(w, "Failed to fetch projects", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var project Project
		err := rows.Scan(
			&project.ID, &project.Name, &project.Description,
			&project.OrganizationID, &project.Status, &project.StartDate,
			&project.EndDate, &project.CreatedBy, &project.UpdatedBy,
			&project.CreatedAt, &project.UpdatedAt,
		)
		if err != nil {
			continue
		}
		projects = append(projects, project)
	}

	json.NewEncoder(w).Encode(projects)
}

func handleGetProjectMilestones(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	claims := r.Context().Value(claimsKey).(*Claims)
	log.Printf("Fetching milestones for projectId: %s, user: %s", projectId, claims.Username)
	// Verify user has access to the project
	var isMember bool
	err := db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 
				FROM rdm.project_members pm
				JOIN auth.users u ON pm.user_id = u.id
				WHERE pm.project_id = $1 AND u.email = $2
			)
		`, projectId, claims.Username).Scan(&isMember)

	if err != nil {
		log.Printf("Error checking project membership: %v", err)
		http.Error(w, "Failed to check project access", http.StatusInternalServerError)
		return
	}

	if !isMember {
		http.Error(w, "Access denied to project milestones", http.StatusForbidden)
		return
	}

	// Fetch milestones for the project
	rows, err := db.Query(`
			SELECT 
				id, project_id, name, description, status, status_id,
				start_date, due_date, priority, category, 
				roadmap_item_id, created_by, updated_by, 
				created_at, updated_at
			FROM rdm.project_milestones
			WHERE project_id = $1
			ORDER BY due_date ASC NULLS LAST, priority DESC
		`, projectId)

	if err != nil {
		log.Printf("Error fetching milestones: %v", err)
		http.Error(w, "Failed to fetch milestones", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var milestones []map[string]interface{}
	for rows.Next() {
		var milestone struct {
			ID            string
			ProjectID     string
			Name          string
			Description   sql.NullString
			Status        sql.NullString
			StatusID      sql.NullString
			StartDate     sql.NullTime
			DueDate       sql.NullTime
			Priority      int
			Category      sql.NullString
			RoadmapItemID sql.NullString
			CreatedBy     string
			UpdatedBy     sql.NullString
			CreatedAt     time.Time
			UpdatedAt     time.Time
		}

		err := rows.Scan(
			&milestone.ID,
			&milestone.ProjectID,
			&milestone.Name,
			&milestone.Description,
			&milestone.Status,
			&milestone.StatusID,
			&milestone.StartDate,
			&milestone.DueDate,
			&milestone.Priority,
			&milestone.Category,
			&milestone.RoadmapItemID,
			&milestone.CreatedBy,
			&milestone.UpdatedBy,
			&milestone.CreatedAt,
			&milestone.UpdatedAt,
		)

		if err != nil {
			log.Printf("Error scanning milestone row: %v", err)
			continue
		}

		// Format the milestone data for JSON response
		milestoneMap := map[string]interface{}{
			"id":            milestone.ID,
			"projectId":     milestone.ProjectID,
			"name":          milestone.Name,
			"description":   nullStringValue(milestone.Description),
			"status":        nullStringValue(milestone.Status),
			"statusId":      nullStringValue(milestone.StatusID),
			"startDate":     formatTimeToDateString(milestone.StartDate),
			"dueDate":       formatTimeToDateString(milestone.DueDate),
			"priority":      milestone.Priority,
			"category":      nullStringValue(milestone.Category),
			"roadmapItemId": nullStringValue(milestone.RoadmapItemID),
			"createdBy":     milestone.CreatedBy,
			"updatedBy":     nullStringValue(milestone.UpdatedBy),
			"createdAt":     milestone.CreatedAt,
			"updatedAt":     milestone.UpdatedAt,
		}

		milestones = append(milestones, milestoneMap)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating milestone rows: %v", err)
		http.Error(w, "Error processing milestones", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(milestones)
}

// Helper function to format sql.NullTime to ISO date string
func formatTimeToDateString(nt sql.NullTime) interface{} {
	if nt.Valid {
		return nt.Time.Format("2006-01-02")
	}
	return nil
}

func handleCreateProject(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name           string    `json:"name"`
		Description    string    `json:"description"`
		OrganizationID uuid.UUID `json:"organizationId"`
		StartDate      *string   `json:"startDate"`
		EndDate        *string   `json:"endDate"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	claims := r.Context().Value(claimsKey).(*Claims)

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var userId uuid.UUID
	err = tx.QueryRow(
		"SELECT id FROM auth.users WHERE email = $1",
		claims.Username,
	).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	var project Project
	err = tx.QueryRow(`
			INSERT INTO rdm.projects 
			(name, description, organization_id, status, created_by)
			VALUES ($1, $2, $3, 'active', $4)
			RETURNING id, name, description, organization_id, status, 
					created_by, created_at, updated_at
		`, req.Name, req.Description, req.OrganizationID, userId).Scan(
		&project.ID, &project.Name, &project.Description,
		&project.OrganizationID, &project.Status, &project.CreatedBy,
		&project.CreatedAt, &project.UpdatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to create project", http.StatusInternalServerError)
		return
	}

	// Add creator as project owner
	_, err = tx.Exec(`
    INSERT INTO rdm.project_members 
    (project_id, user_id, role, is_active, created_by)
    VALUES ($1, $2, 'owner', true, $2)
	`, project.ID, userId)

	if err != nil {
		http.Error(w, "Failed to add project owner", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(project)
}

func handleGetProjectMembers(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["id"]

	rows, err := db.Query(`
			SELECT pm.id, pm.project_id, pm.user_id, u.email,
				CONCAT(u.first_name, ' ', u.last_name) as user_name,
				pm.role, COALESCE(pm.is_active, true) as is_active, pm.created_at
			FROM rdm.project_members pm
			JOIN auth.users u ON pm.user_id = u.id
			WHERE pm.project_id = $1
		`, projectId)

	if err != nil {
		http.Error(w, "Failed to fetch members", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var members []map[string]interface{}
	for rows.Next() {
		var member struct {
			ID        uuid.UUID
			ProjectID uuid.UUID
			UserID    uuid.UUID
			Email     string
			UserName  string
			Role      string
			IsActive  bool // Added this field
			CreatedAt time.Time
		}

		err := rows.Scan(
			&member.ID, &member.ProjectID, &member.UserID,
			&member.Email, &member.UserName, &member.Role,
			&member.IsActive, &member.CreatedAt,
		)
		if err != nil {
			continue
		}

		members = append(members, map[string]interface{}{
			"id":        member.ID,
			"projectId": member.ProjectID,
			"userId":    member.UserID,
			"email":     member.Email,
			"userName":  member.UserName,
			"role":      member.Role,
			"isActive":  member.IsActive, // Added this field
			"createdAt": member.CreatedAt,
		})
	}

	json.NewEncoder(w).Encode(members)
}

func handleGetProject(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	var project Project
	err := db.QueryRow(`
			SELECT p.id, p.name, p.description, p.organization_id, 
				p.status, p.start_date, p.end_date,
				p.created_by, p.updated_by, p.created_at, p.updated_at
			FROM rdm.projects p
			JOIN auth.organization_members om ON p.organization_id = om.organization_id 
			JOIN auth.users u ON om.user_id = u.id
			WHERE p.id = $1 AND u.email = $2
		`, projectId, claims.Username).Scan(
		&project.ID, &project.Name, &project.Description,
		&project.OrganizationID, &project.Status, &project.StartDate,
		&project.EndDate, &project.CreatedBy, &project.UpdatedBy,
		&project.CreatedAt, &project.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Project not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Failed to fetch project", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(project)
}

func handleUpdateProject(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Define request struct with pointers for optional fields
	var req struct {
		Name        *string    `json:"name"`
		Description *string    `json:"description"`
		Status      *string    `json:"status"`
		StartDate   *time.Time `json:"startDate"`
		EndDate     *time.Time `json:"endDate"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get user ID for updated_by
	var userId string
	err := db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Build dynamic update query
	updates := []string{}
	args := []interface{}{}
	argCount := 1

	if req.Name != nil {
		updates = append(updates, fmt.Sprintf("name = $%d", argCount))
		args = append(args, *req.Name)
		argCount++
	}
	if req.Description != nil {
		updates = append(updates, fmt.Sprintf("description = $%d", argCount))
		args = append(args, *req.Description)
		argCount++
	}
	if req.Status != nil {
		updates = append(updates, fmt.Sprintf("status = $%d", argCount))
		args = append(args, *req.Status)
		argCount++
	}
	if req.StartDate != nil {
		updates = append(updates, fmt.Sprintf("start_date = $%d", argCount))
		args = append(args, *req.StartDate)
		argCount++
	}
	if req.EndDate != nil {
		updates = append(updates, fmt.Sprintf("end_date = $%d", argCount))
		args = append(args, *req.EndDate)
		argCount++
	}

	// If no fields provided, reject the request
	if len(updates) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	// Always update updated_by and updated_at
	updates = append(updates, fmt.Sprintf("updated_by = $%d", argCount))
	args = append(args, userId)
	argCount++
	updates = append(updates, "updated_at = CURRENT_TIMESTAMP")

	// Construct and execute the query
	query := fmt.Sprintf("UPDATE rdm.projects SET %s WHERE id = $%d",
		strings.Join(updates, ", "), argCount)
	args = append(args, projectId)

	result, err := db.Exec(query, args...)
	if err != nil {
		http.Error(w, "Failed to update project", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Project not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func handleDeleteProject(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	result, err := db.Exec(`
			DELETE FROM rdm.projects p
			USING auth.users u, auth.organization_members om
			WHERE p.id = $1 
			AND p.organization_id = om.organization_id
			AND om.user_id = u.id 
			AND u.email = $2
		`, projectId, claims.Username)

	if err != nil {
		// Log the specific error
		log.Printf("Error deleting project %s: %v", projectId, err)
		// Return the actual error message to the client for debugging
		http.Error(w, fmt.Sprintf("Failed to delete project: %v", err), http.StatusInternalServerError)
		return
	}

	if rows, _ := result.RowsAffected(); rows == 0 {
		http.Error(w, "Project not found or access denied", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func handleAddProjectMember(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["id"]

	if !isValidUUID(projectId) {
		http.Error(w, "Invalid project ID", http.StatusBadRequest)
		return
	}

	var req struct {
		UserID string `json:"userId"`
		Role   string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if !isValidUUID(req.UserID) {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Validate role
	validRoles := map[string]bool{"owner": true, "admin": true, "member": true}
	if !validRoles[req.Role] {
		http.Error(w, "Invalid role. Must be 'owner', 'admin', or 'member'", http.StatusBadRequest)
		return
	}

	claims := r.Context().Value(claimsKey).(*Claims)
	if claims == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get the creator's ID
	var creatorId string
	err := db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&creatorId)
	if err != nil {
		log.Printf("Error getting creator ID: %v", err)
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Check if the project exists and the user has permission to add members
	var projectExists bool
	var organizationId string
	err = db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 FROM rdm.projects p
            JOIN rdm.project_members pm ON p.id = pm.project_id
            WHERE p.id = $1 AND pm.user_id = $2 AND pm.role IN ('owner', 'admin')
        ), p.organization_id
        FROM rdm.projects p
        WHERE p.id = $1
    `, projectId, creatorId).Scan(&projectExists, &organizationId)

	if err != nil {
		log.Printf("Error checking project access: %v", err)
		http.Error(w, "Failed to verify project access", http.StatusInternalServerError)
		return
	}

	if !projectExists {
		http.Error(w, "Project not found or insufficient permissions", http.StatusForbidden)
		return
	}

	// Check if the user being added exists and is part of the organization
	var userExists bool
	err = db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 FROM auth.users u
            JOIN auth.organization_members om ON u.id = om.user_id
            WHERE u.id = $1 AND om.organization_id = $2 AND u.is_active = true
        )
    `, req.UserID, organizationId).Scan(&userExists)

	if err != nil {
		log.Printf("Error checking user existence: %v", err)
		http.Error(w, "Failed to verify user", http.StatusInternalServerError)
		return
	}

	if !userExists {
		http.Error(w, "User not found or not part of the organization", http.StatusBadRequest)
		return
	}

	// Check if the user is already a member
	var isMember bool
	err = db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 FROM rdm.project_members
            WHERE project_id = $1 AND user_id = $2
        )
    `, projectId, req.UserID).Scan(&isMember)

	if err != nil {
		log.Printf("Error checking existing membership: %v", err)
		http.Error(w, "Failed to check existing membership", http.StatusInternalServerError)
		return
	}

	if isMember {
		http.Error(w, "User is already a member of this project", http.StatusConflict)
		return
	}

	// Add the member
	_, err = db.Exec(`
        INSERT INTO rdm.project_members (project_id, user_id, role, created_by)
        VALUES ($1, $2, $3, $4)
    `, projectId, req.UserID, req.Role, creatorId)

	if err != nil {
		log.Printf("Error adding project member: %v", err)
		http.Error(w, "Failed to add member", http.StatusInternalServerError)
		return
	}

	// Return the new member details
	var member struct {
		ID        string    `json:"id"`
		UserID    string    `json:"userId"`
		UserName  string    `json:"userName"`
		Email     string    `json:"email"`
		Role      string    `json:"role"`
		IsActive  bool      `json:"isActive"`
		CreatedAt time.Time `json:"createdAt"`
	}

	err = db.QueryRow(`
        SELECT pm.id, pm.user_id, CONCAT(u.first_name, ' ', u.last_name), u.email, pm.role, true, pm.created_at
        FROM rdm.project_members pm
        JOIN auth.users u ON pm.user_id = u.id
        WHERE pm.project_id = $1 AND pm.user_id = $2
    `, projectId, req.UserID).Scan(&member.ID, &member.UserID, &member.UserName, &member.Email, &member.Role, &member.IsActive, &member.CreatedAt)

	if err != nil {
		log.Printf("Error fetching new member details: %v", err)
		http.Error(w, "Member added but failed to fetch details", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(member)
}

func handleUpdateMemberRole(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["id"]
	memberId := vars["memberId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	log.Printf("Updating member role for project %s, member %s by user %s", projectId, memberId, claims.Username)

	var req struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate role
	if req.Role != "owner" && req.Role != "admin" && req.Role != "member" {
		http.Error(w, "Invalid role. Must be 'owner', 'admin', or 'member'", http.StatusBadRequest)
		return
	}

	// If changing from owner to something else, check if there will still be at least one owner
	if req.Role != "owner" {
		// First check if this member is currently an owner
		var isCurrentlyOwner bool
		err := db.QueryRow(`
            SELECT EXISTS (
                SELECT 1 
                FROM rdm.project_members
                WHERE (id = $1 OR user_id = $1) AND project_id = $2 AND role = 'owner'
            )
        `, memberId, projectId).Scan(&isCurrentlyOwner)

		if err != nil {
			log.Printf("Error checking if member is owner: %v", err)
			http.Error(w, "Failed to check current role", http.StatusInternalServerError)
			return
		}

		// If they are currently an owner, check if there would be other owners left
		if isCurrentlyOwner {
			var ownerCount int
			err := db.QueryRow(`
                SELECT COUNT(*)
                FROM rdm.project_members
                WHERE project_id = $1 AND role = 'owner'
            `, projectId).Scan(&ownerCount)

			if err != nil {
				log.Printf("Error counting owners: %v", err)
				http.Error(w, "Failed to count project owners", http.StatusInternalServerError)
				return
			}

			if ownerCount <= 1 {
				log.Printf("Cannot change role: This is the last owner of the project")
				http.Error(w, "Cannot update role: Project must have at least one owner", http.StatusBadRequest)
				return
			}
		}
	}

	// Verify the user has permission to update members (must be owner or admin)
	var hasPermission bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_members pm
            JOIN auth.users u ON pm.user_id = u.id
            WHERE pm.project_id = $1 AND u.email = $2
            AND pm.role IN ('owner', 'admin')
        )
    `, projectId, claims.Username).Scan(&hasPermission)

	if err != nil {
		log.Printf("Error checking permission: %v", err)
		http.Error(w, "Failed to check permission", http.StatusInternalServerError)
		return
	}

	if !hasPermission {
		http.Error(w, "You must be an owner or admin to update member roles", http.StatusForbidden)
		return
	}

	// Try to update the member using member ID first
	result, err := db.Exec(`
        UPDATE rdm.project_members 
        SET role = $1
        WHERE id = $2 AND project_id = $3
    `, req.Role, memberId, projectId)

	if err != nil {
		log.Printf("Error updating member role by ID: %v", err)
		http.Error(w, "Failed to update member role", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
		http.Error(w, "Failed to get rows affected", http.StatusInternalServerError)
		return
	}

	// If no rows affected, try using the member ID as user ID
	if rowsAffected == 0 {
		log.Printf("No member found with ID %s, trying as user ID", memberId)
		result, err = db.Exec(`
            UPDATE rdm.project_members 
            SET role = $1
            WHERE user_id = $2 AND project_id = $3
        `, req.Role, memberId, projectId)

		if err != nil {
			log.Printf("Error updating member role by user ID: %v", err)
			http.Error(w, "Failed to update member role", http.StatusInternalServerError)
			return
		}

		rowsAffected, err = result.RowsAffected()
		if err != nil {
			log.Printf("Error getting rows affected: %v", err)
			http.Error(w, "Failed to get rows affected", http.StatusInternalServerError)
			return
		}
	}

	if rowsAffected == 0 {
		http.Error(w, "Member not found", http.StatusNotFound)
		return
	}

	// Fetch the updated member details to return
	var member ProjectMember
	err = db.QueryRow(`
        SELECT id, project_id, user_id, role, created_at, created_by
        FROM rdm.project_members
        WHERE (id = $1 OR user_id = $1) AND project_id = $2
        LIMIT 1
    `, memberId, projectId).Scan(
		&member.ID, &member.ProjectID, &member.UserID,
		&member.Role, &member.CreatedAt, &member.CreatedBy,
	)

	if err != nil {
		log.Printf("Error fetching updated member: %v", err)
		// Still return success since the update happened
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]bool{"success": true})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(member)
}

func handleRemoveProjectMember(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["id"]
	memberId := vars["memberId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	log.Printf("Removing member from project %s, member %s by user %s", projectId, memberId, claims.Username)

	// Verify the user has permission to remove members (must be owner or admin)
	var hasPermission bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_members pm
            JOIN auth.users u ON pm.user_id = u.id
            WHERE pm.project_id = $1 AND u.email = $2
            AND pm.role IN ('owner', 'admin')
        )
    `, projectId, claims.Username).Scan(&hasPermission)

	if err != nil {
		log.Printf("Error checking permission: %v", err)
		http.Error(w, "Failed to check permission", http.StatusInternalServerError)
		return
	}

	if !hasPermission {
		http.Error(w, "You must be an owner or admin to remove members", http.StatusForbidden)
		return
	}

	// Check if the member being removed is an owner
	var isOwner bool
	err = db.QueryRow(`
        SELECT role = 'owner'
        FROM rdm.project_members
        WHERE (id = $1 OR user_id = $1) AND project_id = $2
    `, memberId, projectId).Scan(&isOwner)

	if err != nil && err != sql.ErrNoRows {
		log.Printf("Error checking if member is owner: %v", err)
		http.Error(w, "Failed to check member role", http.StatusInternalServerError)
		return
	}

	// If they are an owner, check if they're the last owner
	if isOwner {
		var ownerCount int
		err := db.QueryRow(`
            SELECT COUNT(*)
            FROM rdm.project_members
            WHERE project_id = $1 AND role = 'owner'
        `, projectId).Scan(&ownerCount)

		if err != nil {
			log.Printf("Error counting owners: %v", err)
			http.Error(w, "Failed to count project owners", http.StatusInternalServerError)
			return
		}

		if ownerCount <= 1 {
			log.Printf("Cannot remove: This is the last owner of the project")
			http.Error(w, "Cannot remove: Project must have at least one owner", http.StatusBadRequest)
			return
		}
	}

	// Check if the member being removed is active
	var isActive bool
	err = db.QueryRow(`
        SELECT COALESCE(is_active, true)
        FROM rdm.project_members
        WHERE (id = $1 OR user_id = $1) AND project_id = $2
    `, memberId, projectId).Scan(&isActive)

	if err != nil && err != sql.ErrNoRows {
		log.Printf("Error checking if member is active: %v", err)
		http.Error(w, "Failed to check member status", http.StatusInternalServerError)
		return
	}

	// If they are active, check if they're the last active member
	if isActive {
		var activeCount int
		err := db.QueryRow(`
            SELECT COUNT(*)
            FROM rdm.project_members
            WHERE project_id = $1 AND COALESCE(is_active, true) = true
        `, projectId).Scan(&activeCount)

		if err != nil {
			log.Printf("Error counting active members: %v", err)
			http.Error(w, "Failed to count active project members", http.StatusInternalServerError)
			return
		}

		if activeCount <= 1 {
			log.Printf("Cannot remove: This is the last active member of the project")
			http.Error(w, "Cannot remove: Project must have at least one active member", http.StatusBadRequest)
			return
		}
	}

	// Try to remove the member using member ID first
	result, err := db.Exec(`
        DELETE FROM rdm.project_members
        WHERE id = $1 AND project_id = $2
    `, memberId, projectId)

	if err != nil {
		log.Printf("Error removing member by ID: %v", err)
		http.Error(w, "Failed to remove member", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
		http.Error(w, "Failed to get rows affected", http.StatusInternalServerError)
		return
	}

	// If no rows affected, try using the member ID as user ID
	if rowsAffected == 0 {
		log.Printf("No member found with ID %s, trying as user ID", memberId)
		result, err = db.Exec(`
            DELETE FROM rdm.project_members
            WHERE user_id = $1 AND project_id = $2
        `, memberId, projectId)

		if err != nil {
			log.Printf("Error removing member by user ID: %v", err)
			http.Error(w, "Failed to remove member", http.StatusInternalServerError)
			return
		}

		rowsAffected, err = result.RowsAffected()
		if err != nil {
			log.Printf("Error getting rows affected: %v", err)
			http.Error(w, "Failed to get rows affected", http.StatusInternalServerError)
			return
		}
	}

	if rowsAffected == 0 {
		http.Error(w, "Member not found", http.StatusNotFound)
		return
	}

	// Add activity log
	userId, err := getUserIdFromEmail(claims.Username)
	if err == nil {
		_, err = db.Exec(`
            INSERT INTO rdm.project_activity (
                project_id, user_id, activity_type, entity_type, entity_id,
                description
            ) VALUES ($1, $2, 'delete', 'member', $3, $4)
        `, projectId, userId, memberId, "Removed member from project")

		if err != nil {
			log.Printf("Failed to log activity: %v", err)
			// Continue anyway since this is not critical
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// handleCreateProjectArtifact handles creating a new project artifact
func handleCreateProjectArtifact(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Verify user is a member of the project with appropriate permissions
	var isMember bool
	err := db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 
				FROM rdm.project_members pm
				JOIN auth.users u ON pm.user_id = u.id
				WHERE pm.project_id = $1 AND u.email = $2
				AND (pm.role = 'owner' OR pm.role = 'admin' OR pm.role = 'member')
			)
		`, projectId, claims.Username).Scan(&isMember)
	if err != nil {
		log.Printf("Error checking project membership: %v", err)
		http.Error(w, "Failed to check project membership", http.StatusInternalServerError)
		return
	}
	if !isMember {
		http.Error(w, "Access denied to create artifacts", http.StatusForbidden)
		return
	}

	var req struct {
		Name        string  `json:"name"`
		Description *string `json:"description"` // Optional
		Type        string  `json:"type"`        // 'document', 'task', 'page', etc.
		Status      string  `json:"status"`      // 'draft', 'in_review', etc.
		AssignedTo  *string `json:"assignedTo"`  // Optional, UUID of user
		DocumentId  *string `json:"documentId"`  // Optional, UUID of document
		PageId      *string `json:"pageId"`      // Optional, UUID of page
		DueDate     *string `json:"dueDate"`     // Optional, ISO date string
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.Name == "" || req.Type == "" || req.Status == "" {
		http.Error(w, "Name, type, and status are required", http.StatusBadRequest)
		return
	}

	// Validate type and status against allowed values
	validTypes := []string{"document", "task", "page", "image", "video", "file", "other"}
	validStatuses := []string{"draft", "in_review", "approved", "rejected"}
	if !contains(validTypes, req.Type) {
		http.Error(w, "Invalid artifact type", http.StatusBadRequest)
		return
	}
	if !contains(validStatuses, req.Status) {
		http.Error(w, "Invalid artifact status", http.StatusBadRequest)
		return
	}

	// Get user ID for created_by and updated_by
	var userId string
	err = db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Prepare due_date (convert string to time if provided)
	var dueDate *time.Time
	if req.DueDate != nil {
		parsedDate, err := time.Parse("2006-01-02", *req.DueDate) // Assuming ISO date format YYYY-MM-DD
		if err != nil {
			http.Error(w, "Invalid due date format. Use YYYY-MM-DD", http.StatusBadRequest)
			return
		}
		dueDate = &parsedDate
	}

	// Insert into project_artifacts
	_, err = db.Exec(`
			INSERT INTO rdm.project_artifacts (
				id, project_id, name, description, type, status, assigned_to, document_id, 
				page_id, due_date, created_by, updated_by, created_at, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		`, uuid.New(), projectId, req.Name, req.Description, req.Type, req.Status,
		req.AssignedTo, req.DocumentId, req.PageId, dueDate, userId, userId)
	if err != nil {
		log.Printf("Failed to create artifact: %v", err)
		http.Error(w, "Failed to create artifact", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Artifact created successfully",
	})
}

// Helper function to check if a slice contains a string
func contains(s []string, str string) bool {
	for _, v := range s {
		if v == str {
			return true
		}
	}
	return false
}

func handleGetProjectActivity(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Verify user has access to the project
	var isMember bool
	err := db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 
				FROM rdm.project_members pm
				JOIN auth.users u ON pm.user_id = u.id
				WHERE pm.project_id = $1 AND u.email = $2
			)
		`, projectId, claims.Username).Scan(&isMember)

	if err != nil {
		http.Error(w, "Failed to check project membership", http.StatusInternalServerError)
		return
	}

	if !isMember {
		http.Error(w, "Access denied to project activity", http.StatusForbidden)
		return
	}

	// Get query parameters
	limit := 100 // Default
	if limitParam := r.URL.Query().Get("limit"); limitParam != "" {
		if parsedLimit, err := strconv.Atoi(limitParam); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	offset := 0
	if offsetParam := r.URL.Query().Get("offset"); offsetParam != "" {
		if parsedOffset, err := strconv.Atoi(offsetParam); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	entityType := r.URL.Query().Get("entityType") // Optional filter

	// Build query with optional filters
	query := `
			SELECT 
				pa.id, 
				pa.project_id, 
				pa.user_id, 
				u.email as user_email,
				CONCAT(u.first_name, ' ', u.last_name) as user_name,
				pa.activity_type, 
				pa.entity_type, 
				pa.entity_id, 
				pa.description, 
				pa.created_at,
				pa.old_values,
				pa.new_values
			FROM rdm.project_activity pa
			LEFT JOIN auth.users u ON pa.user_id = u.id
			WHERE pa.project_id = $1
		`
	args := []interface{}{projectId}
	paramCount := 1

	if entityType != "" {
		paramCount++
		query += fmt.Sprintf(" AND pa.entity_type = $%d", paramCount)
		args = append(args, entityType)
	}

	query += " ORDER BY pa.created_at DESC LIMIT $" + strconv.Itoa(paramCount+1) + " OFFSET $" + strconv.Itoa(paramCount+2)
	args = append(args, limit, offset)

	// Execute query
	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("Error querying project activity: %v", err)
		http.Error(w, "Failed to fetch activity", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var activities []map[string]interface{}
	for rows.Next() {
		var (
			id, projectId                                   string
			userId, userEmail, userName                     sql.NullString // Changed to sql.NullString
			activityType, entityType, entityId, description string
			createdAt                                       time.Time
			oldValues, newValues                            []byte
		)

		err := rows.Scan(
			&id, &projectId, &userId, &userEmail, &userName,
			&activityType, &entityType, &entityId, &description,
			&createdAt, &oldValues, &newValues,
		)
		if err != nil {
			log.Printf("Error scanning activity row: %v", err)
			continue
		}

		// Parse JSON values
		var oldVals, newVals interface{}
		if len(oldValues) > 0 {
			if err := json.Unmarshal(oldValues, &oldVals); err != nil {
				log.Printf("Error unmarshaling old values: %v", err)
			}
		}
		if len(newValues) > 0 {
			if err := json.Unmarshal(newValues, &newVals); err != nil {
				log.Printf("Error unmarshaling new values: %v", err)
			}
		}

		activity := map[string]interface{}{
			"id":            id,
			"projectId":     projectId,
			"userId":        nullStringValue(userId),
			"userEmail":     nullStringValue(userEmail),
			"userName":      nullStringValue(userName),
			"activityType":  activityType,
			"entityType":    entityType,
			"entityId":      entityId,
			"description":   description,
			"createdAt":     createdAt,
			"timestamp":     createdAt.Format(time.RFC3339),
			"formattedDate": createdAt.Format("Jan 2, 2006"),
			"formattedTime": createdAt.Format("3:04 PM"),
			"oldValues":     oldVals,
			"newValues":     newVals,
		}

		activities = append(activities, activity)
	}

	// Get total count for pagination
	var totalCount int
	countQuery := `
			SELECT COUNT(*) FROM rdm.project_activity 
			WHERE project_id = $1
		`
	countArgs := []interface{}{projectId}
	paramCount = 1

	if entityType != "" {
		paramCount++
		countQuery += fmt.Sprintf(" AND entity_type = $%d", paramCount)
		countArgs = append(countArgs, entityType)
	}

	err = db.QueryRow(countQuery, countArgs...).Scan(&totalCount)
	if err != nil {
		log.Printf("Error counting activities: %v", err)
	}

	// Return response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"activities": activities,
		"pagination": map[string]interface{}{
			"total":  totalCount,
			"limit":  limit,
			"offset": offset,
		},
	})
}

func handleGetRoadmapItems(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Verify user is a project member
	var isMember bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 
			FROM rdm.project_members pm
			JOIN auth.users u ON pm.user_id = u.id
			WHERE pm.project_id = $1 AND u.email = $2
		)
		`, projectId, claims.Username).Scan(&isMember)
	if err != nil {
		http.Error(w, "Failed to check project membership", http.StatusInternalServerError)
		return
	}
	if !isMember {
		http.Error(w, "Access denied to project roadmap", http.StatusForbidden)
		return
	}

	rows, err := db.Query(`
		SELECT id, project_id, title, description, start_date, end_date, status, 
				priority, parent_id, category, created_by, updated_by, created_at, updated_at
		FROM rdm.project_roadmap_items
		WHERE project_id = $1
		ORDER BY created_at DESC
		`, projectId)
	if err != nil {
		http.Error(w, "Failed to fetch roadmap items", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var items []map[string]interface{}
	for rows.Next() {
		var id, projectId, createdBy uuid.UUID
		var title, status string
		var description, category sql.NullString
		var startDate, endDate sql.NullTime
		var priority int
		var parentId, updatedBy sql.NullString
		var createdAt, updatedAt time.Time

		err := rows.Scan(&id, &projectId, &title, &description, &startDate, &endDate, &status,
			&priority, &parentId, &category, &createdBy, &updatedBy, &createdAt, &updatedAt)
		if err != nil {
			continue
		}

		item := map[string]interface{}{
			"id":          id.String(),
			"projectId":   projectId.String(),
			"title":       title,
			"description": nullString(description),
			"startDate":   nullTime(startDate),
			"endDate":     nullTime(endDate),
			"status":      status,
			"priority":    priority,
			"parentId":    nullString(parentId),
			"category":    nullString(category),
			"createdBy":   createdBy.String(),
			"updatedBy":   nullString(updatedBy),
			"createdAt":   createdAt,
			"updatedAt":   updatedAt,
		}
		items = append(items, item)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}

func nullString(ns sql.NullString) interface{} {
	if ns.Valid {
		return ns.String
	}
	return nil
}

func nullTime(nt sql.NullTime) interface{} {
	if nt.Valid {
		return nt.Time.Format("2006-01-02")
	}
	return nil
}

func handleUpdateMilestoneStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	statusId := vars["statusId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	var isMember bool
	err := db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 
				FROM rdm.project_members pm
				JOIN auth.users u ON pm.user_id = u.id
				WHERE pm.project_id = $1 AND u.email = $2
			)
		`, projectId, claims.Username).Scan(&isMember)

	if err != nil || !isMember {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	var req struct {
		Name        string `json:"name"`
		Color       string `json:"color"`
		Description string `json:"description"`
		OrderIndex  int    `json:"orderIndex"`
		IsDefault   bool   `json:"isDefault"`
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

	// If this status is being set as default, unset any existing default
	if req.IsDefault {
		_, err = tx.Exec(`
				UPDATE rdm.project_milestone_statuses
				SET is_default = false
				WHERE project_id = $1 AND id != $2
			`, projectId, statusId)
		if err != nil {
			http.Error(w, "Failed to update default status", http.StatusInternalServerError)
			return
		}
	}

	// Update the status
	result, err := tx.Exec(`
			UPDATE rdm.project_milestone_statuses
			SET 
				name = $1,
				color = $2,
				description = $3,
				order_index = $4,
				is_default = $5,
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $6 AND project_id = $7
		`, req.Name, req.Color, req.Description, req.OrderIndex, req.IsDefault, statusId, projectId)

	if err != nil {
		http.Error(w, "Failed to update status", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Status not found or not authorized", http.StatusNotFound)
		return
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	// Return updated status
	var status struct {
		ID          string    `json:"id"`
		Name        string    `json:"name"`
		Color       string    `json:"color"`
		Description string    `json:"description"`
		OrderIndex  int       `json:"orderIndex"`
		IsDefault   bool      `json:"isDefault"`
		UpdatedAt   time.Time `json:"updatedAt"`
	}

	err = db.QueryRow(`
			SELECT id, name, color, description, order_index, is_default, updated_at
			FROM rdm.project_milestone_statuses
			WHERE id = $1
		`, statusId).Scan(
		&status.ID,
		&status.Name,
		&status.Color,
		&status.Description,
		&status.OrderIndex,
		&status.IsDefault,
		&status.UpdatedAt,
	)

	if err != nil {
		http.Error(w, "Failed to fetch updated status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

func handleDeleteMilestoneStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	statusId := vars["statusId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	var isMember bool
	err := db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 
				FROM rdm.project_members pm
				JOIN auth.users u ON pm.user_id = u.id
				WHERE pm.project_id = $1 AND u.email = $2
			)
		`, projectId, claims.Username).Scan(&isMember)

	if err != nil || !isMember {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Check if this is the default status
	var isDefault bool
	err = tx.QueryRow(`
			SELECT is_default
			FROM rdm.project_milestone_statuses
			WHERE id = $1 AND project_id = $2
		`, statusId, projectId).Scan(&isDefault)

	if err == sql.ErrNoRows {
		http.Error(w, "Status not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Failed to check status", http.StatusInternalServerError)
		return
	}

	// Check if there are any milestones using this status
	var milestonesCount int
	err = tx.QueryRow(`
			SELECT COUNT(*)
			FROM rdm.project_milestones
			WHERE status_id = $1
		`, statusId).Scan(&milestonesCount)

	if err != nil {
		http.Error(w, "Failed to check milestones", http.StatusInternalServerError)
		return
	}

	if milestonesCount > 0 {
		http.Error(w, "Cannot delete status that is being used by milestones", http.StatusBadRequest)
		return
	}

	// If this is the default status and there are other statuses,
	// we need to set a new default
	if isDefault {
		var newDefaultId string
		err = tx.QueryRow(`
				SELECT id
				FROM rdm.project_milestone_statuses
				WHERE project_id = $1 AND id != $2
				ORDER BY order_index ASC, created_at ASC
				LIMIT 1
			`, projectId, statusId).Scan(&newDefaultId)

		if err != nil && err != sql.ErrNoRows {
			http.Error(w, "Failed to find new default status", http.StatusInternalServerError)
			return
		}

		if newDefaultId != "" {
			_, err = tx.Exec(`
					UPDATE rdm.project_milestone_statuses
					SET is_default = true
					WHERE id = $1
				`, newDefaultId)

			if err != nil {
				http.Error(w, "Failed to set new default status", http.StatusInternalServerError)
				return
			}
		}
	}

	// Delete the status
	result, err := tx.Exec(`
			DELETE FROM rdm.project_milestone_statuses
			WHERE id = $1 AND project_id = $2
		`, statusId, projectId)

	if err != nil {
		http.Error(w, "Failed to delete status", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Status not found or not authorized", http.StatusNotFound)
		return
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Status deleted successfully",
	})
}

func handleGetMilestoneStatuses(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]

	// Fetch all system statuses and any project-specific statuses
	rows, err := db.Query(`
			SELECT id, name, color, description, is_default, is_system
			FROM rdm.project_milestone_statuses
			WHERE is_system = true 
			OR project_id = $1
			ORDER BY order_index ASC
		`, projectId)
	if err != nil {
		http.Error(w, "Failed to fetch milestone statuses", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var statuses []map[string]interface{}
	for rows.Next() {
		var status struct {
			ID          string
			Name        string
			Color       string
			Description sql.NullString
			IsDefault   bool
			IsSystem    bool
		}
		if err := rows.Scan(&status.ID, &status.Name, &status.Color,
			&status.Description, &status.IsDefault, &status.IsSystem); err != nil {
			continue
		}

		statuses = append(statuses, map[string]interface{}{
			"id":          status.ID,
			"name":        status.Name,
			"color":       status.Color,
			"description": status.Description.String,
			"is_default":  status.IsDefault,
			"is_system":   status.IsSystem,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(statuses)
}

func handleCreateMilestoneStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	var req struct {
		Name        string `json:"name"`
		Color       string `json:"color"`
		Description string `json:"description"`
		OrderIndex  int    `json:"orderIndex"`
		IsDefault   bool   `json:"isDefault"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get user ID
	var userId string
	err := db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	var statusId string
	err = db.QueryRow(`
			INSERT INTO rdm.project_milestone_statuses 
			(project_id, name, color, description, order_index, is_default, created_by)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id
		`, projectId, req.Name, req.Color, req.Description, req.OrderIndex, req.IsDefault, userId).Scan(&statusId)

	if err != nil {
		http.Error(w, "Failed to create status", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":          statusId,
		"name":        req.Name,
		"color":       req.Color,
		"description": req.Description,
		"orderIndex":  req.OrderIndex,
		"isDefault":   req.IsDefault,
	})
}

func handleCreateRoadmapItem(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(claimsKey).(*Claims)

	var req struct {
		ProjectID   string  `json:"projectId"`
		Title       string  `json:"title"`
		Description string  `json:"description"`
		StartDate   *string `json:"startDate"`
		EndDate     *string `json:"endDate"`
		Status      string  `json:"status"`
		Priority    int     `json:"priority"`
		ParentID    *string `json:"parentId"`
		Category    *string `json:"category"`
		AsMilestone bool    `json:"asMilestone"`
		StatusID    *string `json:"statusId"` // For custom milestone status
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.ProjectID == "" || req.Title == "" {
		http.Error(w, "Project ID and title are required", http.StatusBadRequest)
		return
	}

	// Verify user has permission
	var isMember bool
	err := db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 
				FROM rdm.project_members pm
				JOIN auth.users u ON pm.user_id = u.id
				WHERE pm.project_id = $1 AND u.email = $2
			)
		`, req.ProjectID, claims.Username).Scan(&isMember)
	if err != nil || !isMember {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	// Get user ID
	var userId string
	err = db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
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

	// Create roadmap item
	var roadmapItemId string
	err = tx.QueryRow(`
			INSERT INTO rdm.project_roadmap_items (
				project_id, title, description, start_date, end_date,
				status, priority, parent_id, category, created_by
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING id
		`, req.ProjectID, req.Title, req.Description, req.StartDate, req.EndDate,
		req.Status, req.Priority, req.ParentID, req.Category, userId).Scan(&roadmapItemId)

	if err != nil {
		http.Error(w, "Failed to create roadmap item", http.StatusInternalServerError)
		return
	}

	// If creating as milestone, also create milestone entry
	if req.AsMilestone {
		log.Printf("[DEBUG] Creating milestone for roadmap item: %s (AsMilestone=true)", req.Title)
		log.Printf("[DEBUG] Initial StatusID value: %v", req.StatusID)

		var milestoneId string
		var statusName string // Add this to store the status name

		// If no custom status provided, get default status
		if req.StatusID == nil {
			log.Printf("[DEBUG] No StatusID provided, looking for default status for project: %s", req.ProjectID)
			err = tx.QueryRow(`
                SELECT id, name FROM rdm.project_milestone_statuses
                WHERE project_id = $1 AND is_default = true
            `, req.ProjectID).Scan(&req.StatusID, &statusName)

			if err != nil && err != sql.ErrNoRows {
				log.Printf("[ERROR] Failed to get default milestone status: %v", err)
				http.Error(w, "Failed to get default milestone status", http.StatusInternalServerError)
				return
			}

			if err == sql.ErrNoRows {
				log.Printf("[DEBUG] No default milestone status found for project %s", req.ProjectID)
				statusName = "planned" // Default fallback status name
			} else {
				log.Printf("[DEBUG] Using default StatusID: %v, StatusName: %s", req.StatusID, statusName)
			}
		} else {
			// Get the status name from the status ID
			err = tx.QueryRow(`
                SELECT name FROM rdm.project_milestone_statuses
                WHERE id = $1
            `, req.StatusID).Scan(&statusName)

			if err != nil {
				if err == sql.ErrNoRows {
					log.Printf("[DEBUG] No status found with ID %v, using default status name", *req.StatusID)
					statusName = "planned" // Default fallback status name
				} else {
					log.Printf("[ERROR] Failed to get status name: %v", err)
					http.Error(w, "Failed to get status name", http.StatusInternalServerError)
					return
				}
			} else {
				log.Printf("[DEBUG] Using provided StatusID: %v, StatusName: %s", *req.StatusID, statusName)
			}
		}

		// Insert the milestone with both status_id and status fields
		err = tx.QueryRow(`
            INSERT INTO rdm.project_milestones (
                project_id, name, description, status_id, status,
                start_date, due_date, priority, category,
                roadmap_item_id, created_by, updated_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
            RETURNING id
        `, req.ProjectID, req.Title, req.Description, req.StatusID, statusName,
			req.StartDate, req.EndDate, req.Priority, req.Category,
			roadmapItemId, userId).Scan(&milestoneId)

		if err != nil {
			log.Printf("[ERROR] Failed to create milestone: %v", err)
			// Check for specific error types
			if pqErr, ok := err.(*pq.Error); ok {
				log.Printf("[ERROR] PostgreSQL error: Code=%s, Message=%s, Detail=%s, Hint=%s",
					pqErr.Code, pqErr.Message, pqErr.Detail, pqErr.Hint)
			}
			http.Error(w, "Failed to create milestone", http.StatusInternalServerError)
			return
		}

		log.Printf("[DEBUG] Successfully created milestone with ID: %s, Status: %s", milestoneId, statusName)
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	// Return created item
	var createdItem struct {
		ID          string     `json:"id"`
		ProjectID   string     `json:"projectId"`
		Title       string     `json:"title"`
		Description string     `json:"description"`
		StartDate   *time.Time `json:"startDate"`
		EndDate     *time.Time `json:"endDate"`
		Status      string     `json:"status"`
		Priority    int        `json:"priority"`
		ParentID    *string    `json:"parentId"`
		Category    *string    `json:"category"`
		CreatedAt   time.Time  `json:"createdAt"`
		UpdatedAt   time.Time  `json:"updatedAt"`
		IsMilestone bool       `json:"isMilestone"`
	}

	err = db.QueryRow(`
			SELECT 
				id, project_id, title, description, 
				start_date, end_date, status, priority,
				parent_id, category, created_at, updated_at,
				EXISTS(SELECT 1 FROM rdm.project_milestones WHERE roadmap_item_id = id) as is_milestone
			FROM rdm.project_roadmap_items 
			WHERE id = $1
		`, roadmapItemId).Scan(
		&createdItem.ID, &createdItem.ProjectID, &createdItem.Title, &createdItem.Description,
		&createdItem.StartDate, &createdItem.EndDate, &createdItem.Status, &createdItem.Priority,
		&createdItem.ParentID, &createdItem.Category, &createdItem.CreatedAt, &createdItem.UpdatedAt,
		&createdItem.IsMilestone,
	)

	if err != nil {
		http.Error(w, "Failed to fetch created item", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(createdItem)
}

func handleUpdateRoadmapItem(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	itemId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)
	log.Printf("[DEBUG] Starting update for roadmap item %s", itemId)
	var req struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		StartDate   *string `json:"startDate"`
		EndDate     *string `json:"endDate"`
		Status      *string `json:"status"`
		Priority    *int    `json:"priority"`
		ParentID    *string `json:"parentId"`
		Category    *string `json:"category"`
		AsMilestone *bool   `json:"asMilestone"`
		StatusID    *string `json:"statusId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.ParentID == nil {
		log.Printf("[DEBUG] Received parentId is nil")
	} else {
		log.Printf("[DEBUG] Received parentId: '%s'", *req.ParentID)
	}
	var projectId string
	err := db.QueryRow("SELECT project_id FROM rdm.project_roadmap_items WHERE id = $1", itemId).Scan(&projectId)
	if err != nil {
		http.Error(w, "Roadmap item not found", http.StatusNotFound)
		return
	}
	var isMember bool
	err = db.QueryRow(`SELECT EXISTS (SELECT 1 FROM rdm.project_members pm JOIN auth.users u ON pm.user_id = u.id WHERE pm.project_id = $1 AND u.email = $2)`, projectId, claims.Username).Scan(&isMember)
	if err != nil {
		http.Error(w, "Failed to check project membership", http.StatusInternalServerError)
		return
	}
	if !isMember {
		http.Error(w, "Access denied to update roadmap items", http.StatusForbidden)
		return
	}
	var userId uuid.UUID
	err = db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}
	var startDate, endDate *time.Time
	if req.StartDate != nil {
		if *req.StartDate != "" {
			parsed, err := time.Parse("2006-01-02", *req.StartDate)
			if err != nil {
				http.Error(w, "Invalid start date format (YYYY-MM-DD)", http.StatusBadRequest)
				return
			}
			startDate = &parsed
		}
	}
	if req.EndDate != nil {
		if *req.EndDate != "" {
			parsed, err := time.Parse("2006-01-02", *req.EndDate)
			if err != nil {
				http.Error(w, "Invalid end date format (YYYY-MM-DD)", http.StatusBadRequest)
				return
			}
			endDate = &parsed
		}
	}
	var currentTitle, currentStatus string
	var currentDescription, currentCategory sql.NullString
	var currentStartDate, currentEndDate sql.NullTime
	var currentPriority int
	var currentParentId sql.NullString
	err = db.QueryRow(`SELECT title, description, start_date, end_date, status, priority, parent_id, category FROM rdm.project_roadmap_items WHERE id = $1`, itemId).Scan(&currentTitle, &currentDescription, &currentStartDate, &currentEndDate, &currentStatus, &currentPriority, &currentParentId, &currentCategory)
	if err != nil {
		http.Error(w, "Failed to get current values", http.StatusInternalServerError)
		return
	}
	log.Printf("[DEBUG] Current parentId in DB - Valid: %v, Value: %s", currentParentId.Valid, currentParentId.String)
	title := currentTitle
	if req.Title != nil {
		title = *req.Title
	}
	description := currentDescription.String
	if req.Description != nil {
		description = *req.Description
	}
	status := currentStatus
	if req.Status != nil {
		status = *req.Status
	}
	priority := currentPriority
	if req.Priority != nil {
		priority = *req.Priority
	}
	var parentId *string
	if currentParentId.Valid {
		parentId = &currentParentId.String
		log.Printf("[DEBUG] Using existing parentId: %s", *parentId)
	}
	if req.ParentID != nil {
		parentId = req.ParentID
		log.Printf("[DEBUG] Overriding with request parentId")
	} else {
		log.Printf("[DEBUG] Request has null parentId, clearing value")
		parentId = nil
	}
	var parentIdUUID *uuid.UUID
	if parentId != nil && *parentId != "" {
		parsedUUID, err := uuid.Parse(*parentId)
		if err != nil {
			http.Error(w, "Invalid parent ID format", http.StatusBadRequest)
			return
		}
		parentIdUUID = &parsedUUID
		log.Printf("[DEBUG] Parsed parentIdUUID: %s", parentIdUUID)
	} else {
		log.Printf("[DEBUG] parentIdUUID is nil")
	}
	if startDate == nil && currentStartDate.Valid {
		startDate = &currentStartDate.Time
	}
	if endDate == nil && currentEndDate.Valid {
		endDate = &currentEndDate.Time
	}
	var category *string
	if currentCategory.Valid {
		category = &currentCategory.String
	}
	if req.Category != nil {
		category = req.Category
	}
	itemUUID, err := uuid.Parse(itemId)
	if err != nil {
		http.Error(w, "Invalid item ID", http.StatusBadRequest)
		return
	}
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()
	log.Printf("[DEBUG] Calling procedure with parentIdUUID: %v", parentIdUUID)
	_, err = tx.Exec(`CALL rdm.update_roadmap_item($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, itemUUID, title, description, startDate, endDate, status, priority, parentIdUUID, category, userId)
	if err != nil {
		log.Printf("[DEBUG] Procedure call failed: %v", err)
		http.Error(w, "Failed to update roadmap item: "+err.Error(), http.StatusInternalServerError)
		return
	}
	var hasMilestone bool
	err = tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM rdm.project_milestones WHERE roadmap_item_id = $1)`, itemId).Scan(&hasMilestone)
	if err != nil {
		http.Error(w, "Failed to check milestone existence", http.StatusInternalServerError)
		return
	}
	if req.AsMilestone != nil {
		if *req.AsMilestone && !hasMilestone {
			if req.StatusID == nil {
				err = tx.QueryRow(`SELECT id FROM rdm.project_milestone_statuses WHERE project_id = $1 AND is_default = true`, projectId).Scan(&req.StatusID)
				if err != nil && err != sql.ErrNoRows {
					http.Error(w, "Failed to get default milestone status", http.StatusInternalServerError)
					return
				}
			}
			_, err = tx.Exec(`INSERT INTO rdm.project_milestones (project_id, name, description, status_id, start_date, due_date, priority, category, roadmap_item_id, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`, projectId, title, description, req.StatusID, startDate, endDate, priority, category, itemId, userId)
			if err != nil {
				http.Error(w, "Failed to create milestone", http.StatusInternalServerError)
				return
			}
		} else if !*req.AsMilestone && hasMilestone {
			_, err = tx.Exec(`DELETE FROM rdm.project_milestones WHERE roadmap_item_id = $1`, itemId)
			if err != nil {
				http.Error(w, "Failed to remove milestone", http.StatusInternalServerError)
				return
			}
		}
	}
	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}
	var afterParentId sql.NullString
	db.QueryRow(`SELECT parent_id FROM rdm.project_roadmap_items WHERE id = $1`, itemId).Scan(&afterParentId)
	log.Printf("[DEBUG] After update, parentId - Valid: %v, Value: %s", afterParentId.Valid, afterParentId.String)
	log.Printf("[DEBUG] Update completed successfully")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"id": itemId})
}

func handleDeleteRoadmapItem(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	itemId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	log.Printf("[DEBUG] Starting handleDeleteRoadmapItem for itemId: %s", itemId)
	log.Printf("[DEBUG] User requesting deletion: %s", claims.Username)

	// First get the project ID to verify permissions
	var projectId string
	err := db.QueryRow("SELECT project_id FROM rdm.project_roadmap_items WHERE id = $1", itemId).Scan(&projectId)
	if err != nil {
		log.Printf("[ERROR] Failed to find roadmap item %s: %v", itemId, err)
		http.Error(w, "Roadmap item not found", http.StatusNotFound)
		return
	}
	log.Printf("[DEBUG] Found roadmap item in project: %s", projectId)

	// Verify user has permission (e.g., owner or admin)
	var isAdmin bool
	err = db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_members pm
            JOIN auth.users u ON pm.user_id = u.id
            WHERE pm.project_id = $1 AND u.email = $2
            AND pm.role IN ('owner', 'admin', 'super_admin')
        )
    `, projectId, claims.Username).Scan(&isAdmin)

	if err != nil {
		log.Printf("[ERROR] Failed to check project membership: %v", err)
		http.Error(w, "Failed to check project membership", http.StatusInternalServerError)
		return
	}

	log.Printf("[DEBUG] User has admin privileges: %v", isAdmin)
	if !isAdmin {
		log.Printf("[WARNING] Access denied for user %s to delete roadmap item in project %s",
			claims.Username, projectId)
		http.Error(w, "Access denied to delete roadmap items", http.StatusForbidden)
		return
	}

	var userId uuid.UUID
	err = db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		log.Printf("[ERROR] Failed to get user ID for %s: %v", claims.Username, err)
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}
	log.Printf("[DEBUG] User ID: %s", userId)

	// Convert item ID to UUID
	itemUUID, err := uuid.Parse(itemId)
	if err != nil {
		log.Printf("[ERROR] Invalid item ID format: %s - %v", itemId, err)
		http.Error(w, "Invalid item ID", http.StatusBadRequest)
		return
	}
	log.Printf("[DEBUG] Parsed item UUID: %s", itemUUID)

	// Check if this item has children
	var hasChildren bool
	err = db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_roadmap_items 
            WHERE parent_id = $1
        )
    `, itemId).Scan(&hasChildren)

	if err != nil {
		log.Printf("[ERROR] Failed to check for child items: %v", err)
	} else if hasChildren {
		log.Printf("[DEBUG] Item has children: %v", hasChildren)
	}

	// Check if this item is linked to a milestone
	var isMilestone bool
	err = db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_milestones 
            WHERE roadmap_item_id = $1
        )
    `, itemId).Scan(&isMilestone)

	if err != nil {
		log.Printf("[ERROR] Failed to check milestone relationship: %v", err)
	} else {
		log.Printf("[DEBUG] Item is linked to milestone: %v", isMilestone)
	}

	// Try to get the stored procedure definition
	var procExists bool
	err = db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM pg_proc 
            WHERE proname = 'delete_roadmap_item' 
            AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'rdm')
        )
    `).Scan(&procExists)

	if err != nil {
		log.Printf("[WARNING] Failed to check if procedure exists: %v", err)
	} else {
		log.Printf("[DEBUG] Procedure rdm.delete_roadmap_item exists: %v", procExists)
	}

	// Execute the delete stored procedure
	log.Printf("[DEBUG] Calling procedure: CALL rdm.delete_roadmap_item(%s, %s)", itemUUID, userId)
	_, err = db.Exec(`CALL rdm.delete_roadmap_item($1, $2)`, itemUUID, userId)
	if err != nil {
		log.Printf("[ERROR] Failed to delete roadmap item: %v", err)

		// Check for specific error types
		if pqErr, ok := err.(*pq.Error); ok {
			log.Printf("[ERROR] PostgreSQL error: Code=%s, Message=%s, Detail=%s, Hint=%s, Where=%s",
				pqErr.Code, pqErr.Message, pqErr.Detail, pqErr.Hint, pqErr.Where)
		}

		http.Error(w, "Failed to delete roadmap item: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("[INFO] Successfully deleted roadmap item %s", itemId)
	w.WriteHeader(http.StatusOK)
}

// Handler to get categories for a project
func handleGetCategories(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	log.Printf("[handleGetCategories] Fetching categories for projectId: %s", projectId)

	// Verify user has access to the project
	claims := r.Context().Value(claimsKey).(*Claims)
	var isMember bool
	err := db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 
				FROM rdm.project_members pm
				JOIN auth.users u ON pm.user_id = u.id
				WHERE pm.project_id = $1 AND u.email = $2
			)
		`, projectId, claims.Username).Scan(&isMember)
	if err != nil {
		log.Printf("[handleGetCategories] Error verifying membership: %v", err)
		http.Error(w, "Failed to verify membership", http.StatusInternalServerError)
		return
	}
	if !isMember {
		log.Printf("[handleGetCategories] Access denied for user %s to project %s", claims.Username, projectId)
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}
	log.Printf("[handleGetCategories] User %s authorized for project %s", claims.Username, projectId)

	// Fetch categories from the database, including those with NULL project_id
	rows, err := db.Query(`
			SELECT category_name 
			FROM rdm.project_categories 
			WHERE project_id = $1 OR project_id IS NULL
		`, projectId)
	if err != nil {
		log.Printf("[handleGetCategories] Database query error: %v", err)
		http.Error(w, "Failed to fetch categories", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var categories []string
	for rows.Next() {
		var category string
		if err := rows.Scan(&category); err != nil {
			log.Printf("[handleGetCategories] Error scanning category: %v", err)
			http.Error(w, "Error scanning category", http.StatusInternalServerError)
			return
		}
		categories = append(categories, category)
		log.Printf("[handleGetCategories] Found category: %s", category)
	}

	if err = rows.Err(); err != nil {
		log.Printf("[handleGetCategories] Error reading categories: %v", err)
		http.Error(w, "Error reading categories", http.StatusInternalServerError)
		return
	}
	log.Printf("[handleGetCategories] Returning %d categories: %v", len(categories), categories)

	json.NewEncoder(w).Encode(categories)
}

func handleDeleteMilestone(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	milestoneId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	log.Printf("Deleting milestone with ID: %s", milestoneId)

	// First get the project ID to verify permissions
	var projectId string
	err := db.QueryRow("SELECT project_id FROM rdm.project_milestones WHERE id = $1", milestoneId).Scan(&projectId)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Milestone not found", http.StatusNotFound)
			return
		}
		log.Printf("Error fetching milestone: %v", err)
		http.Error(w, "Failed to fetch milestone", http.StatusInternalServerError)
		return
	}

	// Verify user has permission (member of the project)
	var isMember bool
	err = db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_members pm
            JOIN auth.users u ON pm.user_id = u.id
            WHERE pm.project_id = $1 AND u.email = $2
        )
    `, projectId, claims.Username).Scan(&isMember)

	if err != nil {
		log.Printf("Error checking project membership: %v", err)
		http.Error(w, "Failed to check project membership", http.StatusInternalServerError)
		return
	}

	if !isMember {
		http.Error(w, "Access denied to delete milestone", http.StatusForbidden)
		return
	}

	// Get user ID for activity logging
	var userId string
	err = db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		log.Printf("Error getting user ID: %v", err)
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
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

	// Get milestone details for activity log
	var milestoneName string
	var milestoneData []byte
	err = tx.QueryRow(`
        SELECT name, row_to_json(m) 
        FROM rdm.project_milestones m
        WHERE id = $1
    `, milestoneId).Scan(&milestoneName, &milestoneData)

	if err != nil {
		log.Printf("Error getting milestone details: %v", err)
		http.Error(w, "Failed to get milestone details", http.StatusInternalServerError)
		return
	}

	// Delete the milestone
	_, err = tx.Exec("DELETE FROM rdm.project_milestones WHERE id = $1", milestoneId)
	if err != nil {
		log.Printf("Error deleting milestone: %v", err)
		http.Error(w, "Failed to delete milestone", http.StatusInternalServerError)
		return
	}

	// Log the activity
	_, err = tx.Exec(`
        INSERT INTO rdm.project_activity (
            project_id, user_id, activity_type, entity_type, entity_id,
            description, old_values
        ) VALUES ($1, $2, 'delete', 'milestone', $3, $4, $5)
    `, projectId, userId, milestoneId,
		"Deleted milestone: "+milestoneName,
		milestoneData)

	if err != nil {
		log.Printf("Error logging activity: %v", err)
		http.Error(w, "Failed to log activity", http.StatusInternalServerError)
		return
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// Project Properties handlers
func handleGetProjectProperties(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Verify user has access to the project
	var isMember bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_members pm
            JOIN auth.users u ON pm.user_id = u.id
            WHERE pm.project_id = $1 AND u.email = $2
        )
    `, projectId, claims.Username).Scan(&isMember)

	if err != nil {
		log.Printf("Error checking project membership: %v", err)
		http.Error(w, "Failed to verify project access", http.StatusInternalServerError)
		return
	}

	if !isMember {
		http.Error(w, "Access denied to project properties", http.StatusForbidden)
		return
	}

	// Fetch properties for the project
	rows, err := db.Query(`
        SELECT 
            id, project_id, name, type, value, 
            created_at, updated_at
        FROM rdm.project_properties
        WHERE project_id = $1
        ORDER BY name ASC
    `, projectId)

	if err != nil {
		log.Printf("Error fetching project properties: %v", err)
		http.Error(w, "Failed to fetch properties", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var properties []map[string]interface{}
	for rows.Next() {
		var prop struct {
			ID        string
			ProjectID string
			Name      string
			Type      string
			Value     string
			CreatedAt time.Time
			UpdatedAt time.Time
		}

		err := rows.Scan(&prop.ID, &prop.ProjectID, &prop.Name, &prop.Type, &prop.Value, &prop.CreatedAt, &prop.UpdatedAt)
		if err != nil {
			log.Printf("Error scanning property row: %v", err)
			continue
		}

		properties = append(properties, map[string]interface{}{
			"id":        prop.ID,
			"projectId": prop.ProjectID,
			"name":      prop.Name,
			"type":      prop.Type,
			"value":     prop.Value,
			"createdAt": prop.CreatedAt,
			"updatedAt": prop.UpdatedAt,
		})
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating property rows: %v", err)
		http.Error(w, "Error processing properties", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(properties)
}

func handleAddProjectProperty(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Parse request body
	var req struct {
		Name  string `json:"name"`
		Type  string `json:"type"`
		Value string `json:"value"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate that required fields are provided
	if req.Name == "" || req.Type == "" {
		http.Error(w, "Name and type are required", http.StatusBadRequest)
		return
	}

	// Verify user has access to the project
	var isMember bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_members pm
            JOIN auth.users u ON pm.user_id = u.id
            WHERE pm.project_id = $1 AND u.email = $2
        )
    `, projectId, claims.Username).Scan(&isMember)

	if err != nil || !isMember {
		http.Error(w, "Access denied to project properties", http.StatusForbidden)
		return
	}

	// Get user ID
	var userId string
	err = db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Insert the property
	var propertyId string
	err = db.QueryRow(`
        INSERT INTO rdm.project_properties (
            project_id, name, type, value, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $5)
        RETURNING id
    `, projectId, req.Name, req.Type, req.Value, userId).Scan(&propertyId)

	if err != nil {
		log.Printf("Error creating property: %v", err)
		http.Error(w, "Failed to create property", http.StatusInternalServerError)
		return
	}

	// Fetch the created property
	var property struct {
		ID        string    `json:"id"`
		ProjectID string    `json:"projectId"`
		Name      string    `json:"name"`
		Type      string    `json:"type"`
		Value     string    `json:"value"`
		CreatedAt time.Time `json:"createdAt"`
		UpdatedAt time.Time `json:"updatedAt"`
	}

	err = db.QueryRow(`
        SELECT id, project_id, name, type, value, created_at, updated_at
        FROM rdm.project_properties
        WHERE id = $1
    `, propertyId).Scan(
		&property.ID,
		&property.ProjectID,
		&property.Name,
		&property.Type,
		&property.Value,
		&property.CreatedAt,
		&property.UpdatedAt,
	)

	if err != nil {
		log.Printf("Error fetching created property: %v", err)
		http.Error(w, "Property created but failed to fetch details", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(property)
}

func handleUpdateProjectProperty(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	propertyId := vars["propertyId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Parse request body
	var req struct {
		Value string `json:"value"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Verify user has access to the project
	var isMember bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_members pm
            JOIN auth.users u ON pm.user_id = u.id
            WHERE pm.project_id = $1 AND u.email = $2
        )
    `, projectId, claims.Username).Scan(&isMember)

	if err != nil || !isMember {
		http.Error(w, "Access denied to project properties", http.StatusForbidden)
		return
	}

	// Get user ID
	var userId string
	err = db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Update the property
	result, err := db.Exec(`
        UPDATE rdm.project_properties
        SET value = $1, 
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND project_id = $4
    `, req.Value, userId, propertyId, projectId)

	if err != nil {
		log.Printf("Error updating property: %v", err)
		http.Error(w, "Failed to update property", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Property not found or not authorized", http.StatusNotFound)
		return
	}

	// Return success response
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func handleDeleteProjectProperty(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	propertyId := vars["propertyId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Verify user has access to the project
	var isMember bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_members pm
            JOIN auth.users u ON pm.user_id = u.id
            WHERE pm.project_id = $1 AND u.email = $2
        )
    `, projectId, claims.Username).Scan(&isMember)

	if err != nil || !isMember {
		http.Error(w, "Access denied to project properties", http.StatusForbidden)
		return
	}

	// Delete the property
	result, err := db.Exec(`
        DELETE FROM rdm.project_properties
        WHERE id = $1 AND project_id = $2
    `, propertyId, projectId)

	if err != nil {
		log.Printf("Error deleting property: %v", err)
		http.Error(w, "Failed to delete property", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Property not found or not authorized", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// Project Tags handlers
func handleGetProjectTags(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Verify user has access to the project
	var isMember bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_members pm
            JOIN auth.users u ON pm.user_id = u.id
            WHERE pm.project_id = $1 AND u.email = $2
        )
    `, projectId, claims.Username).Scan(&isMember)

	if err != nil {
		log.Printf("Error checking project membership: %v", err)
		http.Error(w, "Failed to verify project access", http.StatusInternalServerError)
		return
	}

	if !isMember {
		http.Error(w, "Access denied to project tags", http.StatusForbidden)
		return
	}

	// Fetch tags for the project
	rows, err := db.Query(`
        SELECT 
            id, project_id, name, color, created_at, updated_at
        FROM rdm.project_tags
        WHERE project_id = $1
        ORDER BY name ASC
    `, projectId)

	if err != nil {
		log.Printf("Error fetching project tags: %v", err)
		http.Error(w, "Failed to fetch tags", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tags []map[string]interface{}
	for rows.Next() {
		var tag struct {
			ID        string
			ProjectID string
			Name      string
			Color     string
			CreatedAt time.Time
			UpdatedAt time.Time
		}

		err := rows.Scan(&tag.ID, &tag.ProjectID, &tag.Name, &tag.Color, &tag.CreatedAt, &tag.UpdatedAt)
		if err != nil {
			log.Printf("Error scanning tag row: %v", err)
			continue
		}

		tags = append(tags, map[string]interface{}{
			"id":        tag.ID,
			"projectId": tag.ProjectID,
			"name":      tag.Name,
			"color":     tag.Color,
			"createdAt": tag.CreatedAt,
			"updatedAt": tag.UpdatedAt,
		})
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating tag rows: %v", err)
		http.Error(w, "Error processing tags", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(tags)
}

func handleAddProjectTag(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Parse request body
	var req struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate that required fields are provided
	if req.Name == "" {
		http.Error(w, "Tag name is required", http.StatusBadRequest)
		return
	}

	// Verify user has access to the project
	var isMember bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_members pm
            JOIN auth.users u ON pm.user_id = u.id
            WHERE pm.project_id = $1 AND u.email = $2
        )
    `, projectId, claims.Username).Scan(&isMember)

	if err != nil || !isMember {
		http.Error(w, "Access denied to project tags", http.StatusForbidden)
		return
	}

	// Get user ID
	var userId string
	err = db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get userID", http.StatusInternalServerError)
		return
	}

	// Set default color if not provided
	color := req.Color
	if color == "" {
		color = "#3B82F6" // Default blue color
	}

	// Insert the tag
	var tagId string
	err = db.QueryRow(`
        INSERT INTO rdm.project_tags (
            project_id, name, color, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $4)
        RETURNING id
    `, projectId, req.Name, color, userId).Scan(&tagId)

	if err != nil {
		log.Printf("Error creating tag: %v", err)
		http.Error(w, "Failed to create tag", http.StatusInternalServerError)
		return
	}

	// Fetch the created tag
	var tag struct {
		ID        string    `json:"id"`
		ProjectID string    `json:"projectId"`
		Name      string    `json:"name"`
		Color     string    `json:"color"`
		CreatedAt time.Time `json:"createdAt"`
		UpdatedAt time.Time `json:"updatedAt"`
	}

	err = db.QueryRow(`
        SELECT id, project_id, name, color, created_at, updated_at
        FROM rdm.project_tags
        WHERE id = $1
    `, tagId).Scan(
		&tag.ID,
		&tag.ProjectID,
		&tag.Name,
		&tag.Color,
		&tag.CreatedAt,
		&tag.UpdatedAt,
	)

	if err != nil {
		log.Printf("Error fetching created tag: %v", err)
		http.Error(w, "Tag created but failed to fetch details", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(tag)
}

func handleToggleMemberStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["id"]
	memberId := vars["memberId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	log.Printf("Toggling member status for project %s, member %s by user %s", projectId, memberId, claims.Username)

	var req struct {
		IsActive bool `json:"isActive"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// If deactivating a member, check if there will still be at least one active member
	if !req.IsActive {
		// Check if this member is currently active
		var isCurrentlyActive bool
		err := db.QueryRow(`
            SELECT EXISTS (
                SELECT 1 
                FROM rdm.project_members
                WHERE (id = $1 OR user_id = $1) AND project_id = $2 AND is_active = true
            )
        `, memberId, projectId).Scan(&isCurrentlyActive)

		if err != nil {
			log.Printf("Error checking if member is active: %v", err)
			http.Error(w, "Failed to check current status", http.StatusInternalServerError)
			return
		}

		// If they are currently active, check if there would be other active members left
		if isCurrentlyActive {
			var activeCount int
			err := db.QueryRow(`
                SELECT COUNT(*)
                FROM rdm.project_members
                WHERE project_id = $1 AND is_active = true
            `, projectId).Scan(&activeCount)

			if err != nil {
				log.Printf("Error counting active members: %v", err)
				http.Error(w, "Failed to count active project members", http.StatusInternalServerError)
				return
			}

			if activeCount <= 1 {
				log.Printf("Cannot deactivate: This is the last active member of the project")
				http.Error(w, "Cannot deactivate: Project must have at least one active member", http.StatusBadRequest)
				return
			}
		}
	}

	// Verify the user has permission to update members (must be owner or admin)
	var hasPermission bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_members pm
            JOIN auth.users u ON pm.user_id = u.id
            WHERE pm.project_id = $1 AND u.email = $2
            AND pm.role IN ('owner', 'admin')
        )
    `, projectId, claims.Username).Scan(&hasPermission)

	if err != nil {
		log.Printf("Error checking permission: %v", err)
		http.Error(w, "Failed to check permission", http.StatusInternalServerError)
		return
	}

	if !hasPermission {
		http.Error(w, "You must be an owner or admin to update member status", http.StatusForbidden)
		return
	}

	// Check if the column exists
	var columnExists bool
	err = db.QueryRow(`
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'rdm'
            AND table_name = 'project_members'
            AND column_name = 'is_active'
        )
    `).Scan(&columnExists)

	if err != nil {
		log.Printf("Error checking if is_active column exists: %v", err)
		http.Error(w, "Failed to check schema", http.StatusInternalServerError)
		return
	}

	if !columnExists {
		// If the column doesn't exist, create it
		_, err = db.Exec(`
            ALTER TABLE rdm.project_members 
            ADD COLUMN is_active BOOLEAN DEFAULT true
        `)
		if err != nil {
			log.Printf("Error adding is_active column: %v", err)
			http.Error(w, "Failed to update database schema", http.StatusInternalServerError)
			return
		}
		log.Printf("Added is_active column to project_members table")
	}

	// Try to update the member using member ID first
	result, err := db.Exec(`
        UPDATE rdm.project_members 
        SET is_active = $1
        WHERE id = $2 AND project_id = $3
    `, req.IsActive, memberId, projectId)

	if err != nil {
		log.Printf("Error updating member status by ID: %v", err)
		http.Error(w, "Failed to update member status", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
		http.Error(w, "Failed to get rows affected", http.StatusInternalServerError)
		return
	}

	// If no rows affected, try using the member ID as user ID
	if rowsAffected == 0 {
		log.Printf("No member found with ID %s, trying as user ID", memberId)
		result, err = db.Exec(`
            UPDATE rdm.project_members 
            SET is_active = $1
            WHERE user_id = $2 AND project_id = $3
        `, req.IsActive, memberId, projectId)

		if err != nil {
			log.Printf("Error updating member status by user ID: %v", err)
			http.Error(w, "Failed to update member status", http.StatusInternalServerError)
			return
		}

		rowsAffected, err = result.RowsAffected()
		if err != nil {
			log.Printf("Error getting rows affected: %v", err)
			http.Error(w, "Failed to get rows affected", http.StatusInternalServerError)
			return
		}
	}

	if rowsAffected == 0 {
		http.Error(w, "Member not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func handleSetProjectVariable(w http.ResponseWriter, r *http.Request) {
	log.Printf("handleSetProjectVariable called")

	vars := mux.Vars(r)
	projectId := vars["projectId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Parse request body
	var req struct {
		Key         string `json:"key"`
		Value       string `json:"value"`
		Description string `json:"description"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Printf("Request data: key=%s, value=%s", req.Key, req.Value)

	// Verify user has access to the project
	var authorized bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_members pm
            JOIN auth.users u ON pm.user_id = u.id
            WHERE pm.project_id = $1 AND u.email = $2
        )
    `, projectId, claims.Username).Scan(&authorized)

	if err != nil {
		log.Printf("Error checking authorization: %v", err)
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	if !authorized {
		http.Error(w, "Access denied to project", http.StatusForbidden)
		return
	}

	// Get user ID
	var userId string
	err = db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		log.Printf("Error getting user ID: %v", err)
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Check if the variable already exists
	var variableExists bool
	err = db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 FROM rdm.project_variables
            WHERE project_id = $1 AND key = $2
        )
    `, projectId, req.Key).Scan(&variableExists)

	if err != nil {
		log.Printf("Error checking if variable exists: %v", err)
		http.Error(w, "Failed to check for existing variable", http.StatusInternalServerError)
		return
	}

	var variableId string
	if variableExists {
		// Only try to get the ID if the variable exists
		err = db.QueryRow(`
            SELECT id FROM rdm.project_variables
            WHERE project_id = $1 AND key = $2
        `, projectId, req.Key).Scan(&variableId)

		if err != nil {
			log.Printf("Error getting variable ID: %v", err)
			http.Error(w, "Failed to get variable ID", http.StatusInternalServerError)
			return
		}
	}

	log.Printf("Variable exists: %v, ID: %s", variableExists, variableId)

	// Create result struct
	var result struct {
		ID          string    `json:"id"`
		ProjectID   string    `json:"projectId"`
		Key         string    `json:"key"`
		Value       string    `json:"value"`
		Description string    `json:"description,omitempty"`
		CreatedBy   string    `json:"createdBy"`
		UpdatedBy   string    `json:"updatedBy"`
		UpdatedAt   time.Time `json:"updatedAt"`
	}

	if variableExists && variableId != "" {
		// Update existing variable
		err = db.QueryRow(`
            UPDATE rdm.project_variables
            SET value = $1, description = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING id, project_id, key, value, description, created_by, updated_by, updated_at
        `, req.Value, req.Description, userId, variableId).Scan(
			&result.ID, &result.ProjectID, &result.Key, &result.Value,
			&result.Description, &result.CreatedBy, &result.UpdatedBy, &result.UpdatedAt,
		)
		if err != nil {
			log.Printf("Error updating variable: %v", err)
			http.Error(w, "Failed to update variable", http.StatusInternalServerError)
			return
		}
	} else {
		// Insert new variable
		err = db.QueryRow(`
            INSERT INTO rdm.project_variables
            (project_id, key, value, description, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $5, $5)
            RETURNING id, project_id, key, value, description, created_by, updated_by, updated_at
        `, projectId, req.Key, req.Value, req.Description, userId).Scan(
			&result.ID, &result.ProjectID, &result.Key, &result.Value,
			&result.Description, &result.CreatedBy, &result.UpdatedBy, &result.UpdatedAt,
		)
		if err != nil {
			log.Printf("Error inserting variable: %v", err)
			http.Error(w, "Failed to insert variable", http.StatusInternalServerError)
			return
		}
	}

	// Add activity log entry
	var activityType string
	var activityDescription string

	if variableExists {
		activityType = "update"
		activityDescription = "Updated variable: " + req.Key
	} else {
		activityType = "create"
		activityDescription = "Created variable: " + req.Key
	}

	_, err = db.Exec(`
        INSERT INTO rdm.project_activity (
            project_id, user_id, activity_type, entity_type, entity_id,
            description, new_values
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, projectId, userId,
		activityType,
		"variable", result.ID,
		activityDescription,
		fmt.Sprintf(`{"key":"%s","value":"%s"}`, req.Key, req.Value))

	if err != nil {
		// Log error but continue
		log.Printf("Failed to record variable activity: %v", err)
	}

	log.Printf("Successfully processed variable: %s", result.ID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// Add a handler to get project variables
func handleGetProjectVariables(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Verify user has access to the project
	var authorized bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_members pm
            JOIN auth.users u ON pm.user_id = u.id
            WHERE pm.project_id = $1 AND u.email = $2
        )
    `, projectId, claims.Username).Scan(&authorized)

	if err != nil || !authorized {
		http.Error(w, "Access denied to project variables", http.StatusForbidden)
		return
	}

	// Fetch the variables
	rows, err := db.Query(`
        SELECT 
            id, project_id, key, value, description, created_by, updated_at
        FROM rdm.project_variables
        WHERE project_id = $1
        ORDER BY key
    `, projectId)

	if err != nil {
		http.Error(w, "Failed to fetch project variables", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var variables []ProjectVariable
	for rows.Next() {
		var variable ProjectVariable
		if err := rows.Scan(
			&variable.ID, &variable.ProjectID, &variable.Key,
			&variable.Value, &variable.Description, &variable.CreatedBy,
			&variable.UpdatedAt,
		); err != nil {
			continue
		}
		variables = append(variables, variable)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(variables)
}

// Also add a handler to delete a project variable
func handleDeleteProjectVariable(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	variableId := vars["variableId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Verify user has access to the project
	var authorized bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_members pm
            JOIN auth.users u ON pm.user_id = u.id
            WHERE pm.project_id = $1 AND u.email = $2
        )
    `, projectId, claims.Username).Scan(&authorized)

	if err != nil || !authorized {
		http.Error(w, "Access denied to project variables", http.StatusForbidden)
		return
	}

	// Get user ID for activity log
	var userId string
	err = db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Get variable details for activity log before deleting
	var variableKey string
	err = db.QueryRow("SELECT key FROM rdm.project_variables WHERE id = $1", variableId).Scan(&variableKey)
	if err != nil && err != sql.ErrNoRows {
		http.Error(w, "Failed to get variable details", http.StatusInternalServerError)
		return
	}

	// Delete the variable
	result, err := db.Exec("DELETE FROM rdm.project_variables WHERE id = $1 AND project_id = $2",
		variableId, projectId)
	if err != nil {
		http.Error(w, "Failed to delete variable", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Variable not found or not authorized", http.StatusNotFound)
		return
	}

	// Add activity log entry
	_, err = db.Exec(`
        INSERT INTO rdm.project_activity (
            project_id, user_id, activity_type, entity_type, entity_id,
            description
        ) VALUES ($1, $2, $3, $4, $5, $6)
    `, projectId, userId, "delete", "variable", variableId,
		"Deleted variable: "+variableKey)

	if err != nil {
		// Log error but continue
		log.Printf("Failed to record variable deletion activity: %v", err)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func handleUpdateProjectTag(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	tagId := vars["tagId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Parse request body
	var req struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Verify user has access to the project
	var isMember bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_members pm
            JOIN auth.users u ON pm.user_id = u.id
            WHERE pm.project_id = $1 AND u.email = $2
        )
    `, projectId, claims.Username).Scan(&isMember)

	if err != nil || !isMember {
		http.Error(w, "Access denied to project tags", http.StatusForbidden)
		return
	}

	// Get user ID
	var userId string
	err = db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Update the tag
	result, err := db.Exec(`
        UPDATE rdm.project_tags
        SET name = $1, 
            color = $2,
            updated_by = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND project_id = $5
    `, req.Name, req.Color, userId, tagId, projectId)

	if err != nil {
		log.Printf("Error updating tag: %v", err)
		http.Error(w, "Failed to update tag", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Tag not found or not authorized", http.StatusNotFound)
		return
	}

	// Return success response
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func handleDeleteProjectTag(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	tagId := vars["tagId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Verify user has access to the project
	var isMember bool
	err := db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 
            FROM rdm.project_members pm
            JOIN auth.users u ON pm.user_id = u.id
            WHERE pm.project_id = $1 AND u.email = $2
        )
    `, projectId, claims.Username).Scan(&isMember)

	if err != nil || !isMember {
		http.Error(w, "Access denied to project tags", http.StatusForbidden)
		return
	}

	// Delete the tag
	result, err := db.Exec(`
        DELETE FROM rdm.project_tags
        WHERE id = $1 AND project_id = $2
    `, tagId, projectId)

	if err != nil {
		log.Printf("Error deleting tag: %v", err)
		http.Error(w, "Failed to delete tag", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Tag not found or not authorized", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func handleUpdateMilestone(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	milestoneId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Log request information for debugging
	log.Printf("Updating milestone ID: %s by user: %s", milestoneId, claims.Username)

	var req struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		Status      *string `json:"status"`
		StatusID    *string `json:"statusId"`
		DueDate     *string `json:"dueDate"`
		// Other fields as needed
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding milestone update request: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("Milestone update request data: %+v", req)

	// Validate that at least one field is being updated
	if req.Name == nil && req.Description == nil && req.Status == nil &&
		req.StatusID == nil && req.DueDate == nil {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	// Verify user has access to the milestone's project
	var projectId string
	err := db.QueryRow(`
        SELECT project_id FROM rdm.project_milestones WHERE id = $1
    `, milestoneId).Scan(&projectId)

	if err == sql.ErrNoRows {
		http.Error(w, "Milestone not found", http.StatusNotFound)
		return
	} else if err != nil {
		log.Printf("Database error checking milestone: %v", err)
		http.Error(w, "Failed to verify milestone", http.StatusInternalServerError)
		return
	}

	// Check if user is a member of the project
	var isMember bool
	err = db.QueryRow(`
        SELECT EXISTS (
            SELECT 1 FROM rdm.project_members pm
            JOIN auth.users u ON pm.user_id = u.id
            WHERE pm.project_id = $1 AND u.email = $2
        )
    `, projectId, claims.Username).Scan(&isMember)

	if err != nil {
		log.Printf("Error checking project membership: %v", err)
		http.Error(w, "Failed to verify permissions", http.StatusInternalServerError)
		return
	}

	if !isMember {
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

	// Build dynamic update query
	updates := []string{"updated_at = CURRENT_TIMESTAMP"}
	args := []interface{}{}
	paramCount := 0

	if req.Name != nil {
		paramCount++
		updates = append(updates, fmt.Sprintf("name = $%d", paramCount))
		args = append(args, *req.Name)
	}

	if req.Description != nil {
		paramCount++
		updates = append(updates, fmt.Sprintf("description = $%d", paramCount))
		args = append(args, *req.Description)
	}

	if req.Status != nil {
		paramCount++
		updates = append(updates, fmt.Sprintf("status = $%d", paramCount))
		args = append(args, *req.Status)
	}

	if req.StatusID != nil {
		paramCount++
		updates = append(updates, fmt.Sprintf("status_id = $%d", paramCount))
		args = append(args, *req.StatusID)
	}

	if req.DueDate != nil {
		var dueDate *time.Time
		if *req.DueDate != "" {
			parsedDate, err := time.Parse("2006-01-02", *req.DueDate)
			if err != nil {
				log.Printf("Invalid date format: %s - %v", *req.DueDate, err)
				http.Error(w, "Invalid date format. Use YYYY-MM-DD", http.StatusBadRequest)
				return
			}
			dueDate = &parsedDate
		}

		paramCount++
		updates = append(updates, fmt.Sprintf("due_date = $%d", paramCount))
		args = append(args, dueDate)
	}

	// Add milestone ID to args
	paramCount++
	args = append(args, milestoneId)

	// Execute update
	query := fmt.Sprintf(`
        UPDATE rdm.project_milestones 
        SET %s 
        WHERE id = $%d
    `, strings.Join(updates, ", "), paramCount)

	log.Printf("Executing update query: %s with args: %v", query, args)
	result, err := tx.Exec(query, args...)

	if err != nil {
		log.Printf("Error updating milestone: %v", err)
		http.Error(w, "Failed to update milestone", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Milestone not found", http.StatusNotFound)
		return
	}

	if err = tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	// Return success response
	log.Printf("Successfully updated milestone %s", milestoneId)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Milestone updated successfully",
		"id":      milestoneId,
	})
}

func handleGetProjectTasks(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Verify user is a project member
	var isMember bool
	err := db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 
				FROM rdm.project_members pm
				JOIN auth.users u ON pm.user_id = u.id
				WHERE pm.project_id = $1 AND u.email = $2
			)
		`, projectId, claims.Username).Scan(&isMember)

	if err != nil || !isMember {
		http.Error(w, "Access denied to project tasks", http.StatusForbidden)
		return
	}

	// Get query parameters for filtering
	status := r.URL.Query().Get("status")
	assignedTo := r.URL.Query().Get("assignedTo")
	parentId := r.URL.Query().Get("parentId")

	// Build dynamic query with filters
	query := `
			SELECT t.id, t.project_id, t.name, t.description, t.status, t.priority,
				t.assigned_to, CONCAT(u.first_name, ' ', u.last_name) as assignee_name,
				t.due_date, t.estimated_hours, t.actual_hours, t.tags,
				t.parent_id, t.created_by, t.updated_by, t.created_at, t.updated_at
			FROM rdm.project_tasks t
			LEFT JOIN auth.users u ON t.assigned_to = u.id
			WHERE t.project_id = $1
		`

	args := []interface{}{projectId}
	paramCount := 1

	if status != "" {
		paramCount++
		query += fmt.Sprintf(" AND t.status = $%d", paramCount)
		args = append(args, status)
	}

	if assignedTo != "" {
		paramCount++
		query += fmt.Sprintf(" AND t.assigned_to = $%d", paramCount)
		args = append(args, assignedTo)
	}

	// Handle parent ID filter (null for top-level tasks)
	if parentId == "null" {
		query += " AND t.parent_id IS NULL"
	} else if parentId != "" {
		paramCount++
		query += fmt.Sprintf(" AND t.parent_id = $%d", paramCount)
		args = append(args, parentId)
	}

	query += " ORDER BY t.due_date ASC NULLS LAST, t.priority DESC, t.created_at DESC"

	rows, err := db.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to fetch tasks", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tasks []map[string]interface{}
	for rows.Next() {
		var id, projectId, createdBy string
		var assignedTo, assigneeName, updatedBy, parentId sql.NullString
		var name, status, priority string
		var description sql.NullString
		var dueDate sql.NullTime
		var estimatedHours, actualHours sql.NullFloat64
		var tags pq.StringArray
		var createdAt, updatedAt time.Time

		err := rows.Scan(
			&id, &projectId, &name, &description, &status, &priority,
			&assignedTo, &assigneeName, &dueDate, &estimatedHours, &actualHours, &tags,
			&parentId, &createdBy, &updatedBy, &createdAt, &updatedAt,
		)

		if err != nil {
			continue
		}

		task := map[string]interface{}{
			"id":             id,
			"projectId":      projectId,
			"name":           name,
			"description":    nullStringValue(description),
			"status":         status,
			"priority":       priority,
			"assignedTo":     nullStringValue(assignedTo),
			"assigneeName":   nullStringValue(assigneeName),
			"dueDate":        nullTimeValue(dueDate),
			"estimatedHours": nullFloat64Value(estimatedHours),
			"actualHours":    nullFloat64Value(actualHours),
			"tags":           tags,
			"parentId":       nullStringValue(parentId),
			"createdBy":      createdBy,
			"updatedBy":      nullStringValue(updatedBy),
			"createdAt":      createdAt,
			"updatedAt":      updatedAt,
		}

		tasks = append(tasks, task)
	}

	// Get children for each task to build a tree structure
	if parentId == "" {
		tasks = buildTaskHierarchy(tasks)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tasks)
}

func buildTaskHierarchy(tasks []map[string]interface{}) []map[string]interface{} {
	// Create a map for quick lookup of tasks by ID
	taskMap := make(map[string]map[string]interface{})
	for _, task := range tasks {
		taskMap[task["id"].(string)] = task
		task["children"] = []interface{}{}
	}

	// Build the hierarchy
	var rootTasks []map[string]interface{}
	for _, task := range tasks {
		parentId, hasParent := task["parentId"].(string)
		if hasParent && parentId != "" {
			// Add to parent's children
			if parent, exists := taskMap[parentId]; exists {
				children := parent["children"].([]interface{})
				parent["children"] = append(children, task)
			}
		} else {
			// This is a root task
			rootTasks = append(rootTasks, task)
		}
	}

	return rootTasks
}

func handleCreateTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// Log incoming request details
	log.Printf("Creating task for project ID: %s by user: %s", projectId, claims.Username)

	if projectId == "" {
		log.Printf("Error: Missing project ID in request")
		http.Error(w, "Project ID is required", http.StatusBadRequest)
		return
	}

	// Parse and validate request body
	var taskData struct {
		Name        string     `json:"name"`
		Description string     `json:"description"`
		Status      string     `json:"status"`
		Priority    string     `json:"priority"`
		ParentID    *string    `json:"parentId"`
		DueDate     *time.Time `json:"dueDate"`
		AssignedTo  *string    `json:"assignedTo"`
	}

	if err := json.NewDecoder(r.Body).Decode(&taskData); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Validate required fields
	if taskData.Name == "" {
		log.Printf("Error: Task name is required")
		http.Error(w, "Task name is required", http.StatusBadRequest)
		return
	}

	// Verify user has permission to create tasks
	var isMember bool
	err := db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 
				FROM rdm.project_members pm
				JOIN auth.users u ON pm.user_id = u.id
				WHERE pm.project_id = $1 AND u.email = $2
			)
		`, projectId, claims.Username).Scan(&isMember)

	if err != nil {
		log.Printf("Error checking project membership: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if !isMember {
		log.Printf("Access denied: User %s is not a member of project %s", claims.Username, projectId)
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	// Get user ID
	var userId string
	err = db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Create task
	var taskId string
	err = tx.QueryRow(`
			INSERT INTO rdm.project_tasks (
				project_id, name, description, status, priority,
				assigned_to, due_date, estimated_hours, actual_hours,
				tags, parent_id, created_by, updated_by
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
			RETURNING id
		`, projectId, taskData.Name, taskData.Description, taskData.Status, taskData.Priority,
		taskData.AssignedTo, taskData.DueDate, nil, nil,
		pq.Array([]string{}), taskData.ParentID, userId).Scan(&taskId)

	if err != nil {
		log.Printf("Error creating task: %v", err)
		if pqErr, ok := err.(*pq.Error); ok {
			// Log specific PostgreSQL error details
			log.Printf("PostgreSQL Error Details - Code: %s, Message: %s, Detail: %s",
				pqErr.Code, pqErr.Message, pqErr.Detail)

			switch pqErr.Code {
			case "23503": // foreign key violation
				http.Error(w, "Invalid reference: The parent task or assignee may not exist", http.StatusBadRequest)
			case "23505": // unique violation
				http.Error(w, "Task with this name already exists", http.StatusBadRequest)
			default:
				http.Error(w, "Error creating task", http.StatusInternalServerError)
			}
		} else {
			http.Error(w, "Error creating task", http.StatusInternalServerError)
		}
		return
	}

	// Create activity log
	_, err = tx.Exec(`
			INSERT INTO rdm.project_activity (
				project_id, user_id, activity_type, entity_type, entity_id, description, metadata
			) VALUES ($1, $2, 'create', 'task', $3, $4, $5)
		`, projectId, userId, taskId,
		"Created task: "+taskData.Name,
		fmt.Sprintf(`{"name":"%s","status":"%s"}`, taskData.Name, taskData.Status))

	if err != nil {
		log.Printf("Error creating activity log: %v", err)
		http.Error(w, "Error creating activity log", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, "Error committing transaction", http.StatusInternalServerError)
		return
	}

	// Return success response with the created task ID
	response := struct {
		Success bool   `json:"success"`
		TaskID  string `json:"taskId"`
	}{
		Success: true,
		TaskID:  taskId,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

func handleGetOrganizationUsers(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	organizationId := vars["organizationId"]

	if !isValidUUID(organizationId) {
		http.Error(w, "Invalid organization ID", http.StatusBadRequest)
		return
	}

	claims := r.Context().Value(claimsKey).(*Claims)
	if claims == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// First verify the user has access to the organization
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
		log.Printf("Error checking organization access: %v", err)
		http.Error(w, "Error checking access", http.StatusInternalServerError)
		return
	}

	if !authorized {
		http.Error(w, "Access denied to organization", http.StatusForbidden)
		return
	}

	query := `
        SELECT DISTINCT u.id, u.first_name, u.last_name, u.email
        FROM auth.users u
        JOIN auth.organization_members om ON u.id = om.user_id
        WHERE om.organization_id = $1 AND u.is_active = true
        ORDER BY u.first_name, u.last_name
    `

	rows, err := db.Query(query, organizationId)
	if err != nil {
		log.Printf("Error fetching organization users: %v", err)
		http.Error(w, "Failed to fetch organization users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []map[string]interface{}
	for rows.Next() {
		var user struct {
			ID        string
			FirstName string
			LastName  string
			Email     string
		}

		err := rows.Scan(&user.ID, &user.FirstName, &user.LastName, &user.Email)
		if err != nil {
			log.Printf("Error scanning user row: %v", err)
			continue
		}

		users = append(users, map[string]interface{}{
			"id":    user.ID,
			"name":  user.FirstName + " " + user.LastName,
			"email": user.Email,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"users": users,
	})
}

func handleUpdateTask(w http.ResponseWriter, r *http.Request) {
	log.Printf("handleUpdateTask: Starting task update for taskId: %s", mux.Vars(r)["id"])
	vars := mux.Vars(r)
	taskId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)
	log.Printf("handleUpdateTask: User claims: %+v", claims)

	// First get the project ID to verify permissions
	var projectId string
	log.Printf("handleUpdateTask: Querying project ID for taskId: %s", taskId)
	err := db.QueryRow("SELECT project_id FROM rdm.project_tasks WHERE id = $1", taskId).Scan(&projectId)
	if err != nil {
		log.Printf("handleUpdateTask: Error querying project ID: %v", err)
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}
	log.Printf("handleUpdateTask: Successfully retrieved projectId: %s", projectId)

	// Verify user has permission
	var isMember bool
	log.Printf("handleUpdateTask: Verifying permission for projectId: %s, user: %s", projectId, claims.Username)
	err = db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 
				FROM rdm.project_members pm
				JOIN auth.users u ON pm.user_id = u.id
				WHERE pm.project_id = $1 AND u.email = $2
			)
		`, projectId, claims.Username).Scan(&isMember)
	if err != nil {
		log.Printf("handleUpdateTask: Error checking membership: %v", err)
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}
	if !isMember {
		log.Printf("handleUpdateTask: Permission denied for user: %s", claims.Username)
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}
	log.Printf("handleUpdateTask: User has permission to update task")

	var req struct {
		Name           *string   `json:"name"`
		Description    *string   `json:"description"`
		Status         *string   `json:"status"`
		Priority       *string   `json:"priority"`
		AssignedTo     *string   `json:"assignedTo"`
		DueDate        *string   `json:"dueDate"`
		EstimatedHours *float64  `json:"estimatedHours"`
		ActualHours    *float64  `json:"actualHours"`
		Tags           *[]string `json:"tags"`
		ParentId       *string   `json:"parentId"`
	}

	log.Printf("handleUpdateTask: Decoding request body")
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("handleUpdateTask: Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Printf("handleUpdateTask: Decoded request: %+v", req)

	// Get current values for activity logging
	var currentValuesBytes []byte
	log.Printf("handleUpdateTask: Fetching current task values for taskId: %s", taskId)
	err = db.QueryRow(`
			SELECT row_to_json(t) FROM (
				SELECT name, description, status, priority, assigned_to,
					due_date, estimated_hours, actual_hours, tags, parent_id
				FROM rdm.project_tasks
				WHERE id = $1
			) t
		`, taskId).Scan(&currentValuesBytes)
	if err != nil {
		log.Printf("handleUpdateTask: Error fetching current values: %v", err)
		http.Error(w, "Failed to get current task values", http.StatusInternalServerError)
		return
	}
	log.Printf("handleUpdateTask: Successfully fetched currentValuesBytes: %s", string(currentValuesBytes))

	// Get user ID
	var userId string
	log.Printf("handleUpdateTask: Fetching user ID for email: %s", claims.Username)
	err = db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
	if err != nil {
		log.Printf("handleUpdateTask: Error fetching user ID: %v", err)
		http.Error(w, "Failed to get user ID", http.StatusInternalServerError)
		return
	}
	log.Printf("handleUpdateTask: Retrieved userId: %s", userId)

	// Parse due date if provided
	var dueDate *time.Time
	log.Printf("handleUpdateTask: Parsing dueDate: %v", req.DueDate)
	if req.DueDate != nil {
		if *req.DueDate != "" {
			parsedDate, err := time.Parse("2006-01-02", *req.DueDate)
			if err != nil {
				log.Printf("handleUpdateTask: Invalid due date format error: %v", err)
				http.Error(w, "Invalid due date format. Use YYYY-MM-DD", http.StatusBadRequest)
				return
			}
			dueDate = &parsedDate
			log.Printf("handleUpdateTask: Parsed dueDate: %v", dueDate)
		}
	}

	// Build dynamic update query
	updates := []string{"updated_by = $1", "updated_at = CURRENT_TIMESTAMP"}
	args := []interface{}{userId}
	paramCount := 1
	log.Printf("handleUpdateTask: Building update query with initial args: %v", args)

	if req.Name != nil {
		paramCount++
		updates = append(updates, fmt.Sprintf("name = $%d", paramCount))
		args = append(args, *req.Name)
		log.Printf("handleUpdateTask: Added name update, paramCount: %d, args: %v", paramCount, args)
	}

	if req.Description != nil {
		paramCount++
		updates = append(updates, fmt.Sprintf("description = $%d", paramCount))
		args = append(args, *req.Description)
		log.Printf("handleUpdateTask: Added description update, paramCount: %d, args: %v", paramCount, args)
	}

	if req.Status != nil {
		paramCount++
		updates = append(updates, fmt.Sprintf("status = $%d", paramCount))
		args = append(args, *req.Status)
		log.Printf("handleUpdateTask: Added status update, paramCount: %d, args: %v", paramCount, args)
	}

	if req.Priority != nil {
		paramCount++
		updates = append(updates, fmt.Sprintf("priority = $%d", paramCount))
		args = append(args, *req.Priority)
		log.Printf("handleUpdateTask: Added priority update, paramCount: %d, args: %v", paramCount, args)
	}

	if req.AssignedTo != nil {
		paramCount++
		updates = append(updates, fmt.Sprintf("assigned_to = $%d", paramCount))
		args = append(args, *req.AssignedTo)
		log.Printf("handleUpdateTask: Added assignedTo update, paramCount: %d, args: %v", paramCount, args)
	}

	if req.DueDate != nil {
		paramCount++
		updates = append(updates, fmt.Sprintf("due_date = $%d", paramCount))
		args = append(args, dueDate)
		log.Printf("handleUpdateTask: Added dueDate update, paramCount: %d, args: %v", paramCount, args)
	}

	if req.EstimatedHours != nil {
		paramCount++
		updates = append(updates, fmt.Sprintf("estimated_hours = $%d", paramCount))
		args = append(args, *req.EstimatedHours)
		log.Printf("handleUpdateTask: Added estimatedHours update, paramCount: %d, args: %v", paramCount, args)
	}

	if req.ActualHours != nil {
		paramCount++
		updates = append(updates, fmt.Sprintf("actual_hours = $%d", paramCount))
		args = append(args, *req.ActualHours)
		log.Printf("handleUpdateTask: Added actualHours update, paramCount: %d, args: %v", paramCount, args)
	}

	if req.Tags != nil {
		paramCount++
		updates = append(updates, fmt.Sprintf("tags = $%d", paramCount))
		args = append(args, pq.Array(*req.Tags))
		log.Printf("handleUpdateTask: Added tags update, paramCount: %d, args: %v", paramCount, args)
	}

	if req.ParentId != nil {
		paramCount++
		updates = append(updates, fmt.Sprintf("parent_id = $%d", paramCount))
		args = append(args, *req.ParentId)
		log.Printf("handleUpdateTask: Added parentId update, paramCount: %d, args: %v", paramCount, args)
	}

	// Start transaction
	log.Printf("handleUpdateTask: Starting transaction")
	tx, err := db.Begin()
	if err != nil {
		log.Printf("handleUpdateTask: Error starting transaction: %v", err)
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	log.Printf("handleUpdateTask: Transaction started successfully")

	// Execute update
	paramCount++
	query := fmt.Sprintf("UPDATE rdm.project_tasks SET %s WHERE id = $%d",
		strings.Join(updates, ", "), paramCount)
	args = append(args, taskId)
	log.Printf("handleUpdateTask: Executing query: %s with args: %v", query, args)
	_, err = tx.Exec(query, args...)
	if err != nil {
		log.Printf("handleUpdateTask: Error executing update: %v", err)
		http.Error(w, "Failed to update task", http.StatusInternalServerError)
		return
	}
	log.Printf("handleUpdateTask: Update executed successfully")

	// Marshal req into JSON for new_values
	log.Printf("handleUpdateTask: Marshaling req into JSON for new_values")
	newValuesBytes, err := json.Marshal(req)
	if err != nil {
		log.Printf("handleUpdateTask: Error marshaling new_values: %v", err)
		http.Error(w, "Failed to process new task values", http.StatusInternalServerError)
		return
	}
	log.Printf("handleUpdateTask: Successfully marshaled newValuesBytes: %s", string(newValuesBytes))

	// Log activity
	log.Printf("handleUpdateTask: Logging activity for taskId: %s", taskId)
	_, err = tx.Exec(`
			INSERT INTO rdm.project_activity (
				project_id, user_id, activity_type, entity_type, entity_id,
				description, old_values, new_values
			) VALUES ($1, $2, 'update', 'task', $3, $4, $5, $6)
		`, projectId, userId, taskId,
		"Updated task details",
		currentValuesBytes,
		newValuesBytes) // Use marshaled byte slice
	if err != nil {
		log.Printf("handleUpdateTask: Error logging activity: %v", err)
		http.Error(w, "Failed to log activity", http.StatusInternalServerError)
		return
	}
	log.Printf("handleUpdateTask: Activity logged successfully")

	// Commit transaction
	log.Printf("handleUpdateTask: Committing transaction")
	if err = tx.Commit(); err != nil {
		log.Printf("handleUpdateTask: Error committing transaction: %v", err)
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}
	log.Printf("handleUpdateTask: Transaction committed successfully")

	w.WriteHeader(http.StatusOK)
	log.Printf("handleUpdateTask: Sending success response for taskId: %s", taskId)
	json.NewEncoder(w).Encode(map[string]string{"id": taskId})
}

func handleDeleteTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	taskId := vars["id"]
	claims := r.Context().Value(claimsKey).(*Claims)

	// First get the project ID to verify permissions
	var projectId string
	var taskName string
	err := db.QueryRow("SELECT project_id, name FROM rdm.project_tasks WHERE id = $1", taskId).Scan(&projectId, &taskName)
	if err != nil {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	// Verify user has permission (owner or admin)
	var isAdmin bool
	err = db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 
				FROM rdm.project_members pm
				JOIN auth.users u ON pm.user_id = u.id
				WHERE pm.project_id = $1 AND u.email = $2
				AND pm.role IN ('owner', 'admin')
			)
		`, projectId, claims.Username).Scan(&isAdmin)

	if err != nil || !isAdmin {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	// Get user ID
	var userId string
	err = db.QueryRow("SELECT id FROM auth.users WHERE email = $1", claims.Username).Scan(&userId)
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

	// Check if task has children
	var hasChildren bool
	err = tx.QueryRow("SELECT EXISTS(SELECT 1 FROM rdm.project_tasks WHERE parent_id = $1)", taskId).Scan(&hasChildren)
	if err != nil {
		http.Error(w, "Failed to check for subtasks", http.StatusInternalServerError)
		return
	}

	if hasChildren {
		http.Error(w, "Cannot delete task with subtasks. Remove subtasks first.", http.StatusBadRequest)
		return
	}

	// Save current task data for activity log
	var taskDataBytes []byte
	err = tx.QueryRow(`
			SELECT row_to_json(t) FROM (
				SELECT * FROM rdm.project_tasks WHERE id = $1
			) t
		`, taskId).Scan(&taskDataBytes)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Task not found", http.StatusNotFound)
			return
		}
		log.Printf("Failed to fetch task data: %v", err)
		http.Error(w, "Failed to fetch task data", http.StatusInternalServerError)
		return
	}

	// Delete the task
	_, err = tx.Exec("DELETE FROM rdm.project_tasks WHERE id = $1", taskId)
	if err != nil {
		http.Error(w, "Failed to delete task", http.StatusInternalServerError)
		return
	}

	// Log activity using taskDataBytes directly
	_, err = tx.Exec(`
			INSERT INTO rdm.project_activity (
				project_id, user_id, activity_type, entity_type, entity_id,
				description, old_values
			) VALUES ($1, $2, 'delete', 'task', $3, $4, $5)
		`, projectId, userId, taskId,
		"Deleted task: "+taskName,
		taskDataBytes)
	if err != nil {
		http.Error(w, "Failed to log activity", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// Helper function to convert sql.NullString to a value that works with JSON
func nullStringValue(ns sql.NullString) interface{} {
	if ns.Valid {
		return ns.String
	}
	return nil
}

// Helper function to convert sql.NullFloat64 to a value that works with JSON
func nullFloat64Value(nf sql.NullFloat64) interface{} {
	if nf.Valid {
		return nf.Float64
	}
	return nil
}

// Helper function to convert sql.NullTime to a value that works with JSON
func nullTimeValue(nt sql.NullTime) interface{} {
	if nt.Valid {
		return nt.Time.Format("2006-01-02")
	}
	return nil
}

func handleGeneratePDF(w http.ResponseWriter, r *http.Request) {
	// Parse request
	var req struct {
		Content string `json:"content"`
		Title   string `json:"title"`
		PageID  string `json:"pageId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	claims := r.Context().Value(claimsKey).(*Claims)
	log.Printf("PDF generation requested by %s for page %s", claims.Username, req.PageID)

	// Create new PDF
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 20, 20)
	pdf.AddPage()

	// Add title
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(170, 10, req.Title)
	pdf.Ln(15)

	// Reset font for content
	pdf.SetFont("Arial", "", 12)

	// Process and extract variables if applicable
	content := req.Content
	if strings.Contains(content, "data-variable") && req.PageID != "" {
		var projectID string
		err := db.QueryRow("SELECT project_id FROM pages.pages_content WHERE id = $1", req.PageID).Scan(&projectID)

		if err == nil && projectID != "" {
			// Fetch variables
			rows, err := db.Query("SELECT key, value FROM rdm.project_variables WHERE project_id = $1", projectID)
			if err == nil {
				defer rows.Close()

				variables := make(map[string]string)
				for rows.Next() {
					var key, value string
					if err := rows.Scan(&key, &value); err == nil {
						variables[key] = value
					}
				}

				// Manual parsing to replace variables
				for key, value := range variables {
					varPattern := fmt.Sprintf(`<span data-variable="%s"[^>]*>([^<]*)</span>`, key)
					content = regexp.MustCompile(varPattern).ReplaceAllString(content, value)
				}
			}
		}
	}

	// Parse HTML and add to PDF
	formattedContent, err := ExtractStructuredText(content)
	if err != nil {
		log.Printf("Warning: Error parsing HTML: %v", err)
		// Fall back to basic content
		pdf.MultiCell(170, 7, content, "", "", false)
	} else {
		// Add structured content
		for _, item := range formattedContent {
			switch item.Type {
			case "heading":
				pdf.SetFont("Arial", "B", 14)
				pdf.MultiCell(170, 7, item.Text, "", "", false)
				pdf.Ln(3)
				pdf.SetFont("Arial", "", 12)
			case "paragraph":
				if item.Text != "" {
					pdf.MultiCell(170, 7, item.Text, "", "", false)
					pdf.Ln(3)
				}
			case "list-item":
				pdf.SetX(25) // Indent
				pdf.MultiCell(165, 7, "• "+item.Text, "", "", false)
			case "task-item":
				checkbox := "☐ "
				if item.Checked {
					checkbox = "☑ "
				}
				pdf.SetX(25) // Indent
				pdf.MultiCell(165, 7, checkbox+item.Text, "", "", false)
			case "table-row":
				// Simple table handling
				if len(item.Cells) > 0 {
					cellWidth := 170.0 / float64(len(item.Cells))
					startX := pdf.GetX()
					startY := pdf.GetY()
					maxY := startY

					for i, cell := range item.Cells {
						pdf.SetXY(startX+float64(i)*cellWidth, startY)
						pdf.Rect(pdf.GetX(), pdf.GetY(), cellWidth, 10, "D")
						pdf.MultiCell(cellWidth, 10, cell, "", "C", false)
						if pdf.GetY() > maxY {
							maxY = pdf.GetY()
						}
					}

					pdf.SetY(maxY)
					pdf.Ln(2)
				}
			}
		}
	}

	// Set response headers
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.pdf"`, req.Title))

	// Output PDF to response writer
	err = pdf.Output(w)
	if err != nil {
		log.Printf("Error generating PDF: %v", err)
		http.Error(w, "Failed to generate PDF", http.StatusInternalServerError)
		return
	}

	log.Printf("PDF successfully generated for page %s", req.PageID)
}

// ContentItem represents structured text with formatting information
type ContentItem struct {
	Type    string
	Text    string
	Cells   []string
	Checked bool
}

// ExtractStructuredText parses HTML and returns structured content
func ExtractStructuredText(htmlContent string) ([]ContentItem, error) {
	doc, err := html.Parse(strings.NewReader(htmlContent))
	if err != nil {
		return nil, err
	}

	var items []ContentItem
	var process func(*html.Node)

	inTable := false
	currentRow := ContentItem{Type: "table-row"}

	process = func(n *html.Node) {
		if n.Type == html.ElementNode {
			switch n.Data {
			case "h1", "h2", "h3", "h4", "h5", "h6":
				var text strings.Builder
				extractText(n, &text)
				items = append(items, ContentItem{
					Type: "heading",
					Text: text.String(),
				})
				return

			case "p":
				var text strings.Builder
				extractText(n, &text)
				items = append(items, ContentItem{
					Type: "paragraph",
					Text: text.String(),
				})
				return

			case "li":
				var text strings.Builder
				extractText(n, &text)
				items = append(items, ContentItem{
					Type: "list-item",
					Text: text.String(),
				})
				return

			case "table":
				inTable = true

			case "tr":
				if inTable {
					currentRow = ContentItem{Type: "table-row", Cells: []string{}}
				}

			case "td", "th":
				if inTable {
					var text strings.Builder
					extractText(n, &text)
					currentRow.Cells = append(currentRow.Cells, text.String())
				}

			case "input":
				// Handle checkboxes for task lists
				var isCheckbox bool
				var isChecked bool
				for _, a := range n.Attr {
					if a.Key == "type" && a.Val == "checkbox" {
						isCheckbox = true
					}
					if a.Key == "checked" {
						isChecked = true
					}
				}

				if isCheckbox {
					// Get the text that follows
					var text strings.Builder
					if n.NextSibling != nil {
						extractText(n.NextSibling, &text)
					}

					items = append(items, ContentItem{
						Type:    "task-item",
						Text:    text.String(),
						Checked: isChecked,
					})
					return
				}
			}
		}

		for c := n.FirstChild; c != nil; c = c.NextSibling {
			process(c)
		}

		// After processing all children of a table row, add it to items
		if n.Type == html.ElementNode && n.Data == "tr" && inTable {
			if len(currentRow.Cells) > 0 {
				items = append(items, currentRow)
			}
		}

		// After processing all children of a table, reset the table state
		if n.Type == html.ElementNode && n.Data == "table" {
			inTable = false
		}
	}

	process(doc)
	return items, nil
}

// Helper function to extract text from HTML nodes
func extractText(n *html.Node, builder *strings.Builder) {
	if n.Type == html.TextNode {
		builder.WriteString(n.Data)
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		extractText(c, builder)
	}
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
	r.HandleFunc("/documents/{id}/project", authMiddleware(handleAssociateDocumentWithProject)).Methods("PUT")
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
	r.HandleFunc("/pages/templates/{id}/favorite", authMiddleware(handleToggleFavoriteTemplate)).Methods("POST")
	r.HandleFunc("/pages/folders", authMiddleware(handleGetPagesFolders)).Methods("GET")
	r.HandleFunc("/pages/folders", authMiddleware(handleCreatePagesFolder)).Methods("POST")
	r.HandleFunc("/pages/folders/{id}", authMiddleware(handleUpdatePagesFolder)).Methods("PUT")
	r.HandleFunc("/pages/folders/{id}", authMiddleware(handleDeletePagesFolder)).Methods("DELETE")
	r.HandleFunc("/pages/templates", authMiddleware(handleCreateTemplate)).Methods("POST")
	r.HandleFunc("/pages/template-categories", authMiddleware(handleGetTemplateCategories)).Methods("GET")
	r.HandleFunc("/pages/templates/{id}", authMiddleware(handleGetTemplate)).Methods("GET")
	r.HandleFunc("/pages/templates/{id}", authMiddleware(handleUpdateTemplate)).Methods("PUT")
	r.HandleFunc("/pages/{id}/project", authMiddleware(handleAssociatePageWithProject)).Methods("PUT")
	r.HandleFunc("/pages/{id}/export-pdf", authMiddleware(handleGeneratePDF)).Methods("POST")

	// Projects
	r.HandleFunc("/projects", authMiddleware(handleGetProjects)).Methods("GET")
	r.HandleFunc("/projects", authMiddleware(handleCreateProject)).Methods("POST")
	r.HandleFunc("/projects/{id}", authMiddleware(handleGetProject)).Methods("GET")
	r.HandleFunc("/projects/{id}", authMiddleware(handleUpdateProject)).Methods("PUT")
	r.HandleFunc("/projects/{id}", authMiddleware(handleDeleteProject)).Methods("DELETE")
	r.HandleFunc("/projects/{id}/members", authMiddleware(handleGetProjectMembers)).Methods("GET")
	r.HandleFunc("/projects/{id}/members", authMiddleware(handleAddProjectMember)).Methods("POST")
	r.HandleFunc("/projects/{id}/members/{memberId}", authMiddleware(handleRemoveProjectMember)).Methods("DELETE")
	r.HandleFunc("/projects/{projectId}/artifacts", authMiddleware(handleGetProjectArtifacts)).Methods("GET")
	r.HandleFunc("/projects/{projectId}/artifacts", authMiddleware(handleCreateProjectArtifact)).Methods("POST")
	r.HandleFunc("/projects/{projectId}/artifacts/{id}", authMiddleware(handleUpdateArtifact)).Methods("PUT")
	r.HandleFunc("/projects/{projectId}/artifact-statuses", authMiddleware(handleGetArtifactStatuses)).Methods("GET")
	r.HandleFunc("/projects/{projectId}/roadmap", authMiddleware(handleGetRoadmapItems)).Methods("GET")
	r.HandleFunc("/projects/{projectId}/roadmap", authMiddleware(handleCreateRoadmapItem)).Methods("POST")
	r.HandleFunc("/projects/{projectId}/roadmap/{id}", authMiddleware(handleUpdateRoadmapItem)).Methods("PUT")
	r.HandleFunc("/projects/{projectId}/roadmap/{id}", authMiddleware(handleDeleteRoadmapItem)).Methods("DELETE")
	r.HandleFunc("/projects/{projectId}/activity", authMiddleware(handleGetProjectActivity)).Methods("GET")
	r.HandleFunc("/projects/{projectId}/roadmap", authMiddleware(handleGetRoadmapItems)).Methods("GET")
	r.HandleFunc("/roadmap-items", authMiddleware(handleCreateRoadmapItem)).Methods("POST")
	r.HandleFunc("/roadmap-items/{id}", authMiddleware(handleUpdateRoadmapItem)).Methods("PUT")
	r.HandleFunc("/roadmap-items/{id}", authMiddleware(handleDeleteRoadmapItem)).Methods("DELETE")
	r.HandleFunc("/projects/{projectId}/categories", authMiddleware(handleGetCategories)).Methods("GET")
	r.HandleFunc("/projects/{projectId}/tasks", authMiddleware(handleGetProjectTasks)).Methods("GET")
	r.HandleFunc("/projects/{projectId}/tasks", authMiddleware(handleCreateTask)).Methods("POST")
	r.HandleFunc("/tasks/{id}", authMiddleware(handleUpdateTask)).Methods("PUT")
	r.HandleFunc("/tasks/{id}", authMiddleware(handleDeleteTask)).Methods("DELETE")
	r.HandleFunc("/projects/{projectId}/milestone-statuses", authMiddleware(handleGetMilestoneStatuses)).Methods("GET")
	r.HandleFunc("/projects/{projectId}/milestone-statuses", authMiddleware(handleCreateMilestoneStatus)).Methods("POST")
	r.HandleFunc("/projects/{projectId}/milestone-statuses/{statusId}", authMiddleware(handleUpdateMilestoneStatus)).Methods("PUT")
	r.HandleFunc("/projects/{projectId}/milestone-statuses/{statusId}", authMiddleware(handleDeleteMilestoneStatus)).Methods("DELETE")
	r.HandleFunc("/projects/{projectId}/milestones", authMiddleware(handleGetProjectMilestones)).Methods("GET")
	r.HandleFunc("/milestones/{id}", authMiddleware(handleDeleteMilestone)).Methods("DELETE")
	r.HandleFunc("/milestones/{id}", authMiddleware(handleUpdateMilestone)).Methods("PUT")
	r.HandleFunc("/projects/{projectId}/properties", authMiddleware(handleGetProjectProperties)).Methods("GET")
	r.HandleFunc("/projects/{projectId}/properties", authMiddleware(handleAddProjectProperty)).Methods("POST")
	r.HandleFunc("/projects/{projectId}/properties/{propertyId}", authMiddleware(handleUpdateProjectProperty)).Methods("PUT")
	r.HandleFunc("/projects/{projectId}/properties/{propertyId}", authMiddleware(handleDeleteProjectProperty)).Methods("DELETE")
	r.HandleFunc("/projects/{id}/members/{memberId}", authMiddleware(handleUpdateMemberRole)).Methods("PUT")
	r.HandleFunc("/projects/{id}/members/{memberId}", authMiddleware(handleRemoveProjectMember)).Methods("DELETE")
	r.HandleFunc("/projects/{id}/members/{memberId}/toggle-status", authMiddleware(handleToggleMemberStatus)).Methods("PUT")
	r.HandleFunc("/projects/{projectId}/variables", authMiddleware(handleGetProjectVariables)).Methods("GET")
	r.HandleFunc("/projects/{projectId}/variables", authMiddleware(handleSetProjectVariable)).Methods("POST")
	r.HandleFunc("/projects/{projectId}/variables/{variableId}", authMiddleware(handleDeleteProjectVariable)).Methods("DELETE")
	// Add similar routes for project tags
	r.HandleFunc("/projects/{projectId}/tags", authMiddleware(handleGetProjectTags)).Methods("GET")
	r.HandleFunc("/projects/{projectId}/tags", authMiddleware(handleAddProjectTag)).Methods("POST")
	r.HandleFunc("/projects/{projectId}/tags/{tagId}", authMiddleware(handleUpdateProjectTag)).Methods("PUT")
	r.HandleFunc("/projects/{projectId}/tags/{tagId}", authMiddleware(handleDeleteProjectTag)).Methods("DELETE")
	r.HandleFunc("/organizations/{organizationId}/users", authMiddleware(handleGetOrganizationUsers)).Methods("GET")
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
