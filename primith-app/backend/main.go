package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

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
	SendGrid struct {
		APIKey string `json:"SENDGRID_API_KEY"`
	} `json:"sendgrid"`
}

func loadConfig() (Config, error) {
	var config Config
	file, err := os.Open("config.json")
	if err != nil {
		return config, err
	}
	defer file.Close()
	return config, json.NewDecoder(file).Decode(&config)
}

func sendEmail(request ContactRequest) error {
	apiKey := os.Getenv("SENDGRID_API_KEY")
	if apiKey == "" {
		// Fallback to config.json for local development
		config, err := loadConfig()
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

func main() {
	r := mux.NewRouter()
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000", "https://primith.com"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Welcome to the Primith API!")
	}).Methods("GET")

	r.HandleFunc("/api/contact", handleContact).Methods("POST")

	handler := c.Handler(r)
	port := ":8080"
	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(port, handler); err != nil {
		log.Fatal(err)
	}
}
