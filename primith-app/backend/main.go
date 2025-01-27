package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
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

type ContactRequest struct {
	FirstName    string `json:"firstName"`
	LastName     string `json:"lastName"`
	Email        string `json:"email"`
	Phone        string `json:"phone"`
	Company      string `json:"company"`
	Message      string `json:"message"`
	CaptchaToken string `json:"captchaToken"`
}

type Response struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
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
}

// User represents a user in the system
type User struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// In-memory user store (replace with database in production)
var users = map[string]User{}

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

	// Add a hardcoded user for testing (remove in production)
	users["john"] = User{
		Username: "john",
		// bcrypt hash of "secret123"
		Password: "$2a$12$K2akvDXv0MqFmmHFyUqoVed/jA6IC5/TZFU0OJMFpSNRN80YR0tW.",
	}

	// Start session cleanup goroutine
	go cleanupSessions()

	log.Println("Initialization complete")
}

// LoadConfigIfDev checks if we're in development mode before loading the config
func loadConfigIfDev() (Config, error) {
	var config Config

	env := os.Getenv("ENVIRONMENT")
	if env == "development" {
		file, err := os.Open("config.json")
		if err != nil {
			return config, err
		}
		defer file.Close()
		err = json.NewDecoder(file).Decode(&config)
		if err != nil {
			return config, err
		}
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

func login(w http.ResponseWriter, r *http.Request) {
	log.Println("Received /login request")

	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		json.NewEncoder(w).Encode(Response{
			Success: false,
			Message: "Invalid request format",
		})
		return
	}

	// Check if the user exists
	storedUser, exists := users[user.Username]
	if !exists {
		json.NewEncoder(w).Encode(Response{
			Success: false,
			Message: "Invalid username or password",
		})
		return
	}

	// Compare the password
	if err := bcrypt.CompareHashAndPassword([]byte(storedUser.Password), []byte(user.Password)); err != nil {
		json.NewEncoder(w).Encode(Response{
			Success: false,
			Message: "Invalid username or password",
		})
		return
	}

	// Generate session ID
	sessionID := uuid.New().String()

	// Create session
	sessions[sessionID] = Session{
		UserID:    user.Username,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	var domain string
	if os.Getenv("ENVIRONMENT") == "production" {
		domain = ".primith.com"
	} else {
		domain = "localhost"
	}

	// Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "sessionID",
		Value:    sessionID,
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true,
		Secure:   os.Getenv("ENVIRONMENT") == "production", // Set to true in production
		Path:     "/",
		Domain:   domain,
		SameSite: http.SameSiteLaxMode,
	})

	log.Printf("New session created: %s for user: %s", sessionID, user.Username)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{Success: true, Message: "Logged in successfully"})
}

func protected(w http.ResponseWriter, r *http.Request) {
	log.Printf("Protected route accessed from: %s", r.RemoteAddr)
	log.Printf("Request cookies: %v", r.Cookies())

	cookie, err := r.Cookie("sessionID")
	if err != nil {
		log.Printf("Cookie error: %v", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	// Validate session
	session, exists := sessions[cookie.Value]
	if !exists {
		log.Printf("Invalid session ID: %s", cookie.Value)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if session is expired
	if time.Now().After(session.ExpiresAt) {
		log.Printf("Expired session: %s", cookie.Value)
		delete(sessions, cookie.Value)
		http.Error(w, "Session expired", http.StatusUnauthorized)
		return
	}

	log.Printf("Valid session found for user: %s", session.UserID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"authenticated": true,
		"user":          session.UserID,
		"message":       fmt.Sprintf("Hello, %s! This is a protected route.", session.UserID),
	})
}

func register(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if _, exists := users[user.Username]; exists {
		http.Error(w, "Username already exists", http.StatusConflict)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	users[user.Username] = User{
		Username: user.Username,
		Password: string(hashedPassword),
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(Response{Success: true, Message: "User registered successfully"})
}

func logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("sessionID")
	if err == nil {
		// Delete session if it exists
		delete(sessions, cookie.Value)
	}

	// Clear the cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "sessionID",
		Value:    "",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   false, // Set to true in production
		Path:     "/",
		Domain:   ".primith.com", // Change to .yourdomain.com in production
		SameSite: http.SameSiteLaxMode,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{Success: true, Message: "Logged out successfully"})
}

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("sessionID")
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		session, exists := sessions[cookie.Value]
		if !exists || time.Now().After(session.ExpiresAt) {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}

func main() {
	r := mux.NewRouter()
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://portal.localhost:5173", "https://primith.com", "https://portal.primith.com"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	// Public routes
	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Welcome to the Primith API")
	}).Methods("GET")
	r.HandleFunc("/api/contact", handleContact).Methods("POST")
	r.HandleFunc("/register", register).Methods("POST")
	r.HandleFunc("/login", login).Methods("POST")
	r.HandleFunc("/logout", logout).Methods("POST")

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
