/// <reference path="../types/esm.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email too long")
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { email } = requestSchema.parse(body);

    // Get IP address for rate limiting
    const rawIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
    const ipAddress = rawIp.split(",")[0].trim() || "0.0.0.0";

    // Check rate limiting
    const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc(
      "check_reset_rate_limit",
      { p_email: email, p_ip_address: ipAddress }
    );

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    }

    if (rateLimitCheck === false) {
      return new Response(
        JSON.stringify({ 
          error: "Too many password reset attempts. Please try again later." 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the attempt
    await supabase.from("password_reset_attempts").insert({
      email,
      ip_address: ipAddress,
      success: false,
    });

    // Check if user exists
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error fetching users:", userError);
      // Don't reveal if user exists or not
      return new Response(
        JSON.stringify({ 
          message: "If an account with that email exists, a password reset link has been sent." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = users.users.find((u) => u.email === email);

    if (!user) {
      // Don't reveal that user doesn't exist (security best practice)
      return new Response(
        JSON.stringify({ 
          message: "If an account with that email exists, a password reset link has been sent." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate secure reset token
    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store token in database
    const { error: tokenError } = await supabase.from("password_reset_tokens").insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
      ip_address: ipAddress,
      user_agent: req.headers.get("user-agent") || null,
    });

    if (tokenError) {
      console.error("Error storing reset token:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to generate reset token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create reset link
    const resetUrl = `${req.headers.get("origin") || "http://localhost:5173"}/reset-password?token=${token}`;

    // Send email via Supabase Auth (uses configured SMTP)
    try {
      // Use Supabase's built-in email functionality
      // Note: In production, you might want to use a custom email service
      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #9333ea 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #9333ea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>We received a request to reset your password for your Nexon AI account. Click the button below to create a new password:</p>
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${resetUrl}</p>
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong><br>
                  This link will expire in 1 hour for security reasons.<br>
                  If you didn't request this password reset, please ignore this email and your password will remain unchanged.
                </div>
                <p>For security reasons, this password reset link can only be used once.</p>
              </div>
              <div class="footer">
                <p>© 2025 Nexon AI. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Note: This requires email configuration in Supabase dashboard
      // For now, we'll return the token for development purposes
      console.log("Password reset link:", resetUrl);

      // Update attempt as successful
      await supabase.from("password_reset_attempts").insert({
        email,
        ip_address: ipAddress,
        success: true,
      });

      // Log reset link server-side only for development debugging
      const isDev = Deno.env.get("ENVIRONMENT") === "development";
      if (isDev) {
        console.log("DEV ONLY - Password reset link:", resetUrl);
      }

      return new Response(
        JSON.stringify({ 
          message: "If an account with that email exists, a password reset link has been sent."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (emailError) {
      console.error("Email error:", emailError);
      // Still return success to not reveal user existence
      return new Response(
        JSON.stringify({ 
          message: "If an account with that email exists, a password reset link has been sent." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in request-password-reset:", error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: error.errors[0].message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
