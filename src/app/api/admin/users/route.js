import { NextResponse } from 'next/server';
import {
  getAdminSessionFromRequest,
  getAllAdminUsers,
  saveAdminUsers,
  hashPassword,
  validatePasswordStrength,
  createAdminToken,
  COOKIE_NAME,
} from '../../../../lib/adminAuth';

export async function GET(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
  }

  const users = getAllAdminUsers().map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    avatar: u.avatar || '',
    createdAt: u.createdAt,
    status: u.status || 'active',
  }));

  return NextResponse.json({ success: true, users });
}

export async function POST(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json(
      { success: false, message: 'Permiso denegado. Solo administradores pueden dar de alta a nuevos usuarios.' },
      { status: 403 }
    );
  }

  try {
    const { email, name, password, role = 'partner', avatar = '' } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, message: 'Email, nombre y contraseña son requeridos.' },
        { status: 400 }
      );
    }

    // Validar contraseña segura
    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      return NextResponse.json(
        { success: false, message: pwdCheck.message },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = getAllAdminUsers();

    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return NextResponse.json(
        { success: false, message: 'Ya existe un usuario con este correo electrónico.' },
        { status: 400 }
      );
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      name: name.trim(),
      role: role === 'admin' ? 'admin' : 'partner',
      avatar: typeof avatar === 'string' ? avatar.trim() : '',
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    users.push(newUser);
    saveAdminUsers(users);

    return NextResponse.json({
      success: true,
      message: 'Usuario socio creado correctamente.',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        avatar: newUser.avatar,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Error al registrar usuario', error: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, newPassword, avatar, name } = body;

    const targetUserId = userId || session.id;

    // Si no es admin, solo puede actualizar su propia cuenta
    if (session.role !== 'admin' && session.id !== targetUserId) {
      return NextResponse.json(
        { success: false, message: 'Permiso denegado. Solo puedes modificar tu propia cuenta.' },
        { status: 403 }
      );
    }

    const users = getAllAdminUsers();
    const userIndex = users.findIndex((u) => u.id === targetUserId);

    if (userIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado.' },
        { status: 404 }
      );
    }

    const targetUser = users[userIndex];

    // Cambio de contraseña
    if (newPassword) {
      const pwdCheck = validatePasswordStrength(newPassword);
      if (!pwdCheck.valid) {
        return NextResponse.json(
          { success: false, message: pwdCheck.message },
          { status: 400 }
        );
      }
      targetUser.passwordHash = hashPassword(newPassword);
      targetUser.updatedAt = new Date().toISOString();
    }

    // Actualización de avatar
    if (avatar !== undefined) {
      targetUser.avatar = typeof avatar === 'string' ? avatar.trim() : '';
      targetUser.updatedAt = new Date().toISOString();
    }

    // Actualización opcional de nombre
    if (name && typeof name === 'string' && name.trim().length > 0) {
      targetUser.name = name.trim();
    }

    users[userIndex] = targetUser;
    saveAdminUsers(users);

    const safeUser = {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      avatar: targetUser.avatar || '',
    };

    const res = NextResponse.json({
      success: true,
      message: newPassword
        ? 'Contraseña y perfil actualizados con éxito.'
        : 'Perfil actualizado con éxito.',
      user: safeUser,
    });

    // Si el usuario actualizado es el actual, refrescamos el token en la cookie
    if (session.id === targetUser.id) {
      const newToken = createAdminToken(targetUser);
      res.cookies.set(COOKIE_NAME, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return res;
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Error al actualizar usuario', error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json(
      { success: false, message: 'Permiso denegado. Solo administradores pueden eliminar socios.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const userIdFromQuery = searchParams.get('userId');
    let userId = userIdFromQuery;

    if (!userId) {
      try {
        const body = await request.json();
        userId = body.userId;
      } catch {}
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'ID de usuario requerido para la eliminación.' },
        { status: 400 }
      );
    }

    if (userId === session.id) {
      return NextResponse.json(
        { success: false, message: 'No puedes eliminar tu propia cuenta de administrador activa.' },
        { status: 400 }
      );
    }

    const users = getAllAdminUsers();
    const targetUser = users.find((u) => u.id === userId);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado.' },
        { status: 404 }
      );
    }

    if (targetUser.role === 'admin') {
      return NextResponse.json(
        { success: false, message: 'No se permite eliminar cuentas con rol de Administrador.' },
        { status: 403 }
      );
    }

    const filteredUsers = users.filter((u) => u.id !== userId);
    saveAdminUsers(filteredUsers);

    return NextResponse.json({
      success: true,
      message: `El socio ${targetUser.name} (${targetUser.email}) ha sido eliminado correctamente.`,
      deletedUserId: userId,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Error al eliminar usuario', error: err.message },
      { status: 500 }
    );
  }
}
