import os
import sys
import time
from typing import Optional
import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from pingme.client import PingmeClient, PingmeError
from pingme.config import load_config, mask_token, save_config

console = Console()


def get_client() -> PingmeClient:
    cfg = load_config()
    server_url = cfg.get("server_url", "http://localhost:8000")
    token = cfg.get("token", "")
    return PingmeClient(server_url=server_url, token=token)


class DefaultGroup(click.Group):
    """
    A Click Group that routes any unrecognized command or bare arguments
    to the default 'send' command. Enables:
    pingme "Hello iPhone"
    pingme -t "ALERT" "Disk full"
    pingme -w "Should I restart?"
    """

    def parse_args(self, ctx, args):
        if not args:
            return super().parse_args(ctx, args)
        first = args[0]
        # If first arg is not a recognized subcommand or standard help flag, route to 'send'
        if first not in self.commands and first not in ("--help", "-h"):
            args = ["send"] + args
        return super().parse_args(ctx, args)


@click.group(cls=DefaultGroup, invoke_without_command=True)
@click.pass_context
def cli(ctx):
    """PINGME — Terminal to iPhone Voice Messaging System"""
    if ctx.invoked_subcommand is None:
        console.print("[yellow]Run 'pingme --help' or 'pingme \"Your message\"' to send a message.[/yellow]")


@cli.command("send")
@click.argument("message")
@click.option("-t", "--title", default=None, help="Optional message title/header")
@click.option("-p", "--priority", default="normal", type=click.Choice(["low", "normal", "high"], case_sensitive=False), help="Delivery priority")
@click.option("-w", "--wait", is_flag=True, help="Wait for reply from iPhone")
@click.option("--timeout", default=None, type=int, help="Wait timeout in seconds")
@click.option("-c", "--conversation", default=None, help="Target conversation ID")
def send_command(message, title, priority, wait, timeout, conversation):
    """Send a message to iPhone with optional title, priority, and reply waiting."""
    cfg = load_config()
    wait_timeout = timeout or cfg.get("timeout", 60)
    client = get_client()

    try:
        msg = client.send_message(
            content=message,
            title=title,
            priority=priority,
            conversation_id=conversation,
        )

        msg_id = msg.get("id")
        msg_status = msg.get("status")
        console.print(
            f"[green]✓[/green] Message sent successfully (ID: [bold cyan]{msg_id}[/bold cyan], Status: [yellow]{msg_status}[/yellow])"
        )

        if wait:
            console.print(f"Waiting for reply... (timeout: {wait_timeout}s, press Ctrl+C to cancel)")
            start_time = time.time()
            try:
                with console.status("[bold cyan]Waiting for reply from iPhone...[/bold cyan]", spinner="dots"):
                    reply = client.wait_for_reply(message_id=msg_id, timeout=wait_timeout)
            except KeyboardInterrupt:
                console.print("\n[yellow]Wait cancelled by user.[/yellow]")
                sys.exit(130)

            if reply:
                content = reply.get("content", "")
                is_voice = reply.get("voice_transcribed", False)
                device = reply.get("sender_device", "iPhone")
                voice_badge = " [bold magenta]🎤 (Voice Dictated)[/bold magenta]" if is_voice else ""
                console.print(f"\n[bold green]Reply from {device}:[/bold green] {content}{voice_badge}\n")
            else:
                elapsed = int(time.time() - start_time)
                console.print(f"\n[yellow]No reply received within {elapsed}s.[/yellow]")
                sys.exit(2)

    except PingmeError as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        sys.exit(1)


@cli.command("status")
def status_command():
    """Check server status, database health, and push notification readiness."""
    client = get_client()
    cfg = load_config()
    try:
        health = client.get_health()
        auth_info = client.verify_auth()

        table = Table(title="PINGME System Status", show_header=True, header_style="bold cyan")
        table.add_column("Property", style="dim")
        table.add_column("Value")

        table.add_row("Server URL", cfg.get("server_url"))
        table.add_row("Server Status", f"[green]{health.get('status')}[/green]")
        table.add_row("Database", f"[green]{health.get('database')}[/green]")
        table.add_row(
            "VAPID Push Configured",
            "[green]Yes[/green]" if health.get("vapid_configured") else "[red]No[/red]",
        )
        table.add_row("Active Push Subscriptions", str(health.get("active_subscriptions", 0)))
        table.add_row("Registered Devices", str(health.get("registered_devices", 0)))
        table.add_row("Total Messages", str(health.get("total_messages", 0)))
        table.add_row("Authenticated As", f"{auth_info.get('name')} ({auth_info.get('prefix')})")

        console.print(table)
    except PingmeError as e:
        console.print(f"[bold red]Connection Error:[/bold red] {str(e)}")
        sys.exit(1)


@cli.command("history")
@click.option("-n", "--limit", default=15, type=int, help="Number of messages to display")
def history_command(limit):
    """View recent message history and delivery status."""
    client = get_client()
    try:
        data = client.get_messages(limit=limit)
        items = data.get("items", [])
        if not items:
            console.print("[yellow]No message history found.[/yellow]")
            return

        table = Table(
            title=f"Recent Messages (Total: {data.get('total')})",
            show_header=True,
            header_style="bold cyan",
        )
        table.add_column("Time", style="dim", width=12)
        table.add_column("Priority", width=8)
        table.add_column("Title / Content", width=40)
        table.add_column("Status", width=14)
        table.add_column("Replies", width=25)

        for m in items:
            created = m.get("created_at", "")[:19].replace("T", " ")
            pri = m.get("priority", "normal")
            pri_styled = f"[red]{pri}[/red]" if pri == "high" else pri

            text = m.get("content", "")
            if m.get("title"):
                text = f"[bold]{m.get('title')}[/bold]\n{text}"

            replies = m.get("replies", [])
            reply_text = ""
            if replies:
                last_reply = replies[-1]
                v = " 🎤" if last_reply.get("voice_transcribed") else ""
                reply_text = f"{last_reply.get('content', '')}{v}"

            table.add_row(created, pri_styled, text, m.get("status", ""), reply_text)

        console.print(table)
    except PingmeError as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        sys.exit(1)


@cli.command("devices")
def devices_command():
    """List registered mobile devices and active push subscriptions."""
    client = get_client()
    try:
        devices = client.get_devices()
        if not devices:
            console.print("[yellow]No devices registered yet. Open the PWA on iPhone to register.[/yellow]")
            return

        table = Table(title="Registered Devices", show_header=True, header_style="bold cyan")
        table.add_column("Device ID", style="dim")
        table.add_column("Name")
        table.add_column("Platform")
        table.add_column("Push Subscriptions")
        table.add_column("Last Seen", style="dim")

        for d in devices:
            table.add_row(
                d.get("id"),
                d.get("name"),
                d.get("platform"),
                str(d.get("subscription_count", 0)),
                d.get("last_seen_at", "")[:19].replace("T", " "),
            )

        console.print(table)
    except PingmeError as e:
        console.print(f"[bold red]Error:[/bold red] {str(e)}")
        sys.exit(1)


@cli.command("listen")
def listen_command():
    """Listen for incoming replies from iPhone in real-time."""
    client = get_client()
    console.print("[bold cyan]Listening for incoming replies from iPhone... (Ctrl+C to stop)[/bold cyan]")
    seen_reply_ids = set()

    try:
        history = client.get_messages(limit=10)
        for m in history.get("items", []):
            for r in m.get("replies", []):
                seen_reply_ids.add(r.get("id"))
    except Exception:
        pass

    try:
        while True:
            try:
                data = client.get_messages(limit=5)
                for m in reversed(data.get("items", [])):
                    for r in m.get("replies", []):
                        r_id = r.get("id")
                        if r_id not in seen_reply_ids:
                            seen_reply_ids.add(r_id)
                            voice = " [magenta]🎤 (Voice)[/magenta]" if r.get("voice_transcribed") else ""
                            console.print(
                                f"\n[bold green]Reply from iPhone[/bold green]{voice} on '[dim]{m.get('content')[:30]}...[/dim]':\n"
                                f"  [bold]{r.get('content')}[/bold]"
                            )
            except PingmeError:
                pass
            time.sleep(2)
    except KeyboardInterrupt:
        console.print("\n[yellow]Stopped listening.[/yellow]")


@cli.command("chat")
@click.option("-t", "--title", default="Terminal Chat", help="Chat session title")
def chat_command(title):
    """Start an interactive two-way terminal conversation session with iPhone."""
    client = get_client()
    console.print(
        Panel(
            f"[bold cyan]Starting interactive chat session: '{title}'[/bold cyan]\n"
            "Type your message and press Enter. The CLI will send it and wait for your iPhone's reply.\n"
            "Type [yellow]exit[/yellow] or press [yellow]Ctrl+C[/yellow] to quit.",
            title="PINGME Interactive Chat",
        )
    )

    try:
        while True:
            try:
                user_msg = console.input("[bold blue]You (Terminal) > [/bold blue]").strip()
            except (KeyboardInterrupt, EOFError):
                break

            if not user_msg:
                continue
            if user_msg.lower() in ("exit", "quit", ":q"):
                break

            try:
                msg = client.send_message(content=user_msg, title=title)
                msg_id = msg.get("id")

                with console.status("[bold cyan]Waiting for iPhone reply...[/bold cyan]", spinner="dots"):
                    reply = client.wait_for_reply(message_id=msg_id, timeout=120)

                if reply:
                    voice = " 🎤" if reply.get("voice_transcribed") else ""
                    console.print(f"[bold green]iPhone{voice} > [/bold green]{reply.get('content')}\n")
                else:
                    console.print("[dim italic](No reply within 120s)[/dim italic]\n")
            except PingmeError as e:
                console.print(f"[red]Error: {e}[/red]")
    except KeyboardInterrupt:
        pass

    console.print("\n[yellow]Chat session ended.[/yellow]")


@cli.command("doctor")
def doctor_command():
    """Run comprehensive system diagnostics for connectivity and push health."""
    console.print("[bold cyan]Running PINGME system diagnostics...[/bold cyan]\n")
    cfg = load_config()
    server_url = cfg.get("server_url")
    token = cfg.get("token")
    client = PingmeClient(server_url=server_url, token=token)

    # 1. Config check
    console.print(f"[bold]1. Local Configuration:[/bold] server={server_url}, token={mask_token(token)} [green]✓ PASS[/green]")

    # 2. Server connectivity & latency
    start = time.time()
    try:
        health = client.get_health()
        latency = (time.time() - start) * 1000
        console.print(f"[bold]2. Server Reachability:[/bold] HTTP 200 ({latency:.1f}ms latency) [green]✓ PASS[/green]")
    except Exception as e:
        console.print(f"[bold]2. Server Reachability:[/bold] [red]✗ FAIL - {e}[/red]")
        console.print("[yellow]Recommendation: Ensure the backend is running with 'uvicorn backend.app.main:app'[/yellow]")
        sys.exit(1)

    # 3. Authentication
    try:
        auth_info = client.verify_auth()
        console.print(f"[bold]3. API Token Authentication:[/bold] Valid as '{auth_info.get('name')}' [green]✓ PASS[/green]")
    except Exception as e:
        console.print(f"[bold]3. API Token Authentication:[/bold] [red]✗ FAIL - {e}[/red]")
        console.print("[yellow]Recommendation: Run 'pingme auth login' to configure a valid API token.[/yellow]")
        sys.exit(1)

    # 4. VAPID Push Setup
    if health.get("vapid_configured"):
        console.print("[bold]4. VAPID Web Push Keys:[/bold] Initialized [green]✓ PASS[/green]")
    else:
        console.print("[bold]4. VAPID Web Push Keys:[/bold] [red]✗ FAIL - Keys missing[/red]")

    # 5. Active Subscriptions
    subs = health.get("active_subscriptions", 0)
    devices = health.get("registered_devices", 0)
    if subs > 0:
        console.print(
            f"[bold]5. iOS Push Delivery Pipeline:[/bold] {subs} active subscription(s) across {devices} device(s) [green]✓ PASS[/green]"
        )
    else:
        console.print("[bold]5. iOS Push Delivery Pipeline:[/bold] [yellow]⚠ WARNING - 0 active push subscriptions[/yellow]")
        console.print("[dim]Open the PWA on your iPhone (Share -> Add to Home Screen) and tap 'Enable' in Settings.[/dim]")

    console.print("\n[bold green]Diagnostics complete![/bold green]")


@cli.group("config")
def config_group():
    """Manage local CLI configuration."""
    pass


@config_group.command("show")
def config_show():
    """Display current CLI configuration."""
    cfg = load_config()
    table = Table(title="PINGME CLI Configuration", show_header=True, header_style="bold cyan")
    table.add_column("Setting", style="dim")
    table.add_column("Value")

    table.add_row("Server URL", cfg.get("server_url", ""))
    table.add_row("API Token", mask_token(cfg.get("token", "")))
    table.add_row("Default Timeout", f"{cfg.get('timeout', 60)}s")
    table.add_row("Device Name", cfg.get("device_name", ""))

    console.print(table)


@config_group.command("set")
@click.option("--server", default=None, help="Server URL")
@click.option("--token", default=None, help="API token")
@click.option("--timeout", default=None, type=int, help="Default timeout in seconds")
def config_set(server, token, timeout):
    """Update configuration settings."""
    cfg = load_config()
    if server:
        cfg["server_url"] = server.rstrip("/")
    if token:
        cfg["token"] = token
    if timeout:
        cfg["timeout"] = timeout
    save_config(cfg)
    console.print("[green]Configuration updated successfully.[/green]")


@cli.group("auth")
def auth_group():
    """Manage authentication and tokens."""
    pass


@auth_group.command("login")
def auth_login():
    """Configure server URL and API token interactively."""
    console.print("[bold cyan]PINGME CLI Authentication Setup[/bold cyan]")
    cfg = load_config()

    default_url = cfg.get("server_url", "http://localhost:8000")
    server_url = click.prompt("Server URL", default=default_url)
    token = click.prompt("API Token (pm_...)", hide_input=True)

    client = PingmeClient(server_url=server_url, token=token)
    try:
        with console.status("Verifying credentials against server..."):
            auth_info = client.verify_auth()
        console.print(f"[green]✓ Successfully authenticated as '{auth_info.get('name')}'![/green]")

        cfg["server_url"] = server_url.rstrip("/")
        cfg["token"] = token
        save_config(cfg)
        console.print("[green]Configuration saved to ~/.config/pingme/config.json[/green]")
    except Exception as e:
        console.print(f"[bold red]Authentication failed:[/bold red] {e}")
        sys.exit(1)


def main():
    cli()


if __name__ == "__main__":
    main()
